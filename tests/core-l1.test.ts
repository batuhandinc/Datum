import { describe, expect, it } from "vitest";
import {
  computeL1,
  proposeShaftOffsets,
  requiredElevatorCount,
  shaftAbsolutePosition,
  suggestStrategy,
  type CoreRuleInput,
  type L1Input,
} from "@/lib/core/l1";
import {
  boundingBox,
  containsPolygon,
  multiPolygon,
  pointInPolygon,
  polygon,
  rectangle,
  translatePolygon,
  type LocalMultiPolygon,
} from "@/lib/geometry";

/**
 * L1 — ÇEKİRDEK YERLEŞİMİ.
 *
 * "Bitti sayılır" ölçütünün ilk yarısı: "program girilince çekirdek yerleşiyor".
 * Şaft düşey sürekliliği kullanıcının ayrıca istediği testtir.
 */

/** Sentetik kural — GERÇEK MEVZUAT DEĞİL, test için uydurulmuş ölçüler. */
const RULE: CoreRuleInput = {
  elevatorRequiredFloorThreshold: 4,
  elevatorRequiredHeightThreshold: 12.5,
  minElevatorCount: 1,
  stretcherElevatorRequired: true,
  minStretcherCabinWidth: 1.2,
  minStretcherCabinDepth: 2.3,
  minStairWidth: 1.2,
  minCirculationWidth: 1.5,
  maxEscapeDistance: 30,
};

/** 40×20 dikdörtgen zarf. */
function rectEnvelope(width: number, height: number): LocalMultiPolygon {
  const hw = width / 2;
  const hh = height / 2;
  return multiPolygon([
    [
      [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
        [-hw, -hh],
      ],
    ],
  ]);
}

function input(overrides: Partial<L1Input> = {}): L1Input {
  return {
    buildableEnvelope: rectEnvelope(24, 20),
    floorCount: 6,
    buildingHeight: 18,
    unitCountPerFloor: 4,
    coreRule: RULE,
    elevators: [],
    strategyOverride: null,
    ...overrides,
  };
}

describe("gereken asansör adedi", () => {
  it("eşiğin altında asansör zorunlu değil", () => {
    expect(requiredElevatorCount(RULE, 2, 6)).toBe(0);
  });

  it("kat eşiği sağlanınca paket minimumu", () => {
    expect(requiredElevatorCount(RULE, 4, 6)).toBe(1);
  });

  it("yükseklik eşiği tek başına da tetikliyor", () => {
    expect(requiredElevatorCount(RULE, 2, 20)).toBe(1);
  });

  it("eşik sağlanıyor ama minimum tanımsızsa HESAPLANMIYOR", () => {
    // Koda gömülü "1" yazmak ilke 1 ihlali olurdu.
    expect(requiredElevatorCount({ ...RULE, minElevatorCount: null }, 10, 30)).toBeNull();
  });
});

describe("strateji önerisi", () => {
  it("kareye yakın plakada merkezî", () => {
    expect(suggestStrategy(polygon(rectEnvelope(20, 20).coordinates[0]!), 4)).toBe("merkezi");
  });

  it("uzun plakada kenar", () => {
    expect(suggestStrategy(polygon(rectEnvelope(40, 15).coordinates[0]!), 4)).toBe("kenar");
  });

  it("çok uzun VE çok birimli plakada çift", () => {
    expect(suggestStrategy(polygon(rectEnvelope(60, 15).coordinates[0]!), 12)).toBe("cift");
  });

  it("çok uzun ama az birimli plakada çift DEĞİL", () => {
    // İki çekirdek birim sayısı gerektirmeden maliyet ekler.
    expect(suggestStrategy(polygon(rectEnvelope(60, 15).coordinates[0]!), 3)).toBe("kenar");
  });

  it("kullanıcı ezmesi öneriyi geçersiz kılıyor", () => {
    const r = computeL1(input({ strategyOverride: "cift" }));
    expect(r.coreStrategy).toBe("cift");
  });
});

describe("çekirdek yerleşimi", () => {
  it("zarfın içine yerleşiyor ve alan üretiyor", () => {
    const r = computeL1(input());
    expect(r.geometry).not.toBeNull();
    expect(r.area).toBeGreaterThan(0);
    expect(r.coreStrategy).toBe("merkezi");
    expect(containsPolygon(polygon(rectEnvelope(24, 20).coordinates[0]!), r.geometry!)).toBe(true);
  });

  it("ölçüler kural + asansörden geliyor", () => {
    // genişlik = kuyu(1.2) + merdiven(1.2) + hol(1.5) = 3.9
    // derinlik = max(kuyu derinliği 2.3, merdiven 1.2) + hol(1.5) = 3.8
    const r = computeL1(input());
    const bb = boundingBox(r.geometry!);
    expect(bb.width).toBeCloseTo(3.9, 6);
    expect(bb.height).toBeCloseTo(3.8, 6);
    expect(r.area).toBeCloseTo(3.9 * 3.8, 3);
  });

  it("kullanıcının girdiği kuyu ölçüsü paket minimumunu eziyor", () => {
    const r = computeL1(input({ elevators: [{ shaftWidth: 2.0, shaftDepth: 2.6 }] }));
    const bb = boundingBox(r.geometry!);
    expect(bb.width).toBeCloseTo(2.0 + 1.2 + 1.5, 6);
    expect(bb.height).toBeCloseTo(2.6 + 1.5, 6);
  });

  it("iki asansör çekirdeği genişletiyor", () => {
    const r = computeL1(
      input({ coreRule: { ...RULE, minElevatorCount: 2 } }),
    );
    expect(boundingBox(r.geometry!).width).toBeCloseTo(1.2 * 2 + 1.2 + 1.5, 6);
  });

  it("kenar stratejisinde çekirdek kenara yaslanıyor", () => {
    const envelope = rectEnvelope(40, 15);
    const r = computeL1(input({ buildableEnvelope: envelope, unitCountPerFloor: 4 }));
    expect(r.coreStrategy).toBe("kenar");
    // Merkezî olsaydı x ≈ 0 olurdu; kenarda sol sınıra yakın.
    expect(boundingBox(r.geometry!).minX).toBeCloseTo(-20, 6);
  });
});

describe("kural yoksa hesaplanmaz (ilke 1)", () => {
  it("CoreRule yoksa çekirdek üretilmiyor", () => {
    const r = computeL1(input({ coreRule: null }));
    expect(r.geometry).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("CORE_RULE_MISSING");
  });

  it("sirkülasyon genişliği yoksa boyutlandırılamıyor", () => {
    const r = computeL1(input({ coreRule: { ...RULE, minCirculationWidth: null } }));
    expect(r.geometry).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("CORE_DIMENSIONS_UNAVAILABLE");
    // Strateji yine de önerilmiş olmalı — kısmi sonuç kaybolmuyor.
    expect(r.coreStrategy).toBe("merkezi");
  });

  it("merdiven genişliği yoksa boyutlandırılamıyor", () => {
    const r = computeL1(input({ coreRule: { ...RULE, minStairWidth: null } }));
    expect(r.geometry).toBeNull();
  });

  it("zarf yoksa uyarı, istisna değil", () => {
    const r = computeL1(input({ buildableEnvelope: null }));
    expect(r.geometry).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("CORE_PLATE_MISSING");
  });
});

describe("kaçış mesafesi — engellemez, uyarır (ilke 7)", () => {
  it("küçük plakada sınır aşılmıyor", () => {
    const r = computeL1(input());
    expect(r.escapeDistance).toBeLessThan(RULE.maxEscapeDistance!);
    expect(r.warnings.map((w) => w.code)).not.toContain("CORE_ESCAPE_DISTANCE_EXCEEDED");
  });

  it("büyük plakada uyarı üretiyor ama çekirdek YİNE de yerleşiyor", () => {
    const r = computeL1(input({ buildableEnvelope: rectEnvelope(120, 80) }));
    expect(r.geometry).not.toBeNull(); // engellenmedi
    const w = r.warnings.find((x) => x.code === "CORE_ESCAPE_DISTANCE_EXCEEDED");
    expect(w).toBeDefined();
    expect(Number(w!.params!.limit)).toBe(30);
  });

  it("sınır tanımsızsa uyarı üretilmiyor", () => {
    const r = computeL1(
      input({
        buildableEnvelope: rectEnvelope(120, 80),
        coreRule: { ...RULE, maxEscapeDistance: null },
      }),
    );
    expect(r.warnings.map((x) => x.code)).not.toContain("CORE_ESCAPE_DISTANCE_EXCEEDED");
  });
});

describe("bölünmüş zarf", () => {
  it("en büyük parçaya yerleşiyor ve uyarıyor", () => {
    const split = multiPolygon([
      rectEnvelope(6, 6).coordinates[0]!,
      translatePolygon(polygon(rectEnvelope(24, 20).coordinates[0]!), 60, 0).coordinates,
    ]);
    const r = computeL1(input({ buildableEnvelope: split }));
    expect(r.warnings.map((w) => w.code)).toContain("CORE_ENVELOPE_SPLIT");
    // Büyük parça x=60 civarında; çekirdek oraya gitmeli.
    expect(boundingBox(r.geometry!).minX).toBeGreaterThan(40);
  });
});

describe("şaft düşey sürekliliği — yapısal garanti", () => {
  it("çekirdek taşınınca şaft birlikte taşınıyor, offset DEĞİŞMİYOR", () => {
    const before = computeL1(input()).geometry!;

    // Şaft, çekirdek merkezine göre sabit bir offset taşıyor.
    const offsetX = 0.8;
    const offsetY = -0.5;
    const absBefore = shaftAbsolutePosition(before, offsetX, offsetY);

    // Kullanıcı çekirdeği taşıyor (bir ezme).
    const after = translatePolygon(before, 7, -3);
    const absAfter = shaftAbsolutePosition(after, offsetX, offsetY);

    expect(absAfter[0] - absBefore[0]).toBeCloseTo(7, 9);
    expect(absAfter[1] - absBefore[1]).toBeCloseTo(-3, 9);
  });

  it("aynı offset her katta AYNI mutlak konumu veriyor", () => {
    // Katlar arasında çekirdek değişmez (proje geneli sabit), dolayısıyla
    // aynı offset aynı yeri verir. Düşey süreklilik korunacak bir kural
    // değil, göreli konumun DOĞRUDAN sonucudur.
    const core = computeL1(input()).geometry!;
    const positions = [1, 2, 3, 4, 5].map(() => shaftAbsolutePosition(core, 0.8, -0.5));
    for (const p of positions) {
      expect(p[0]).toBeCloseTo(positions[0]![0], 12);
      expect(p[1]).toBeCloseTo(positions[0]![1], 12);
    }
  });

  it("şaft mutlak konumu çekirdeğin içinde", () => {
    const core = computeL1(input()).geometry!;
    const bb = boundingBox(core);
    const [x, y] = shaftAbsolutePosition(core, 0.5, 0.5);
    expect(x).toBeGreaterThan(bb.minX);
    expect(x).toBeLessThan(bb.maxX);
    expect(y).toBeGreaterThan(bb.minY);
    expect(y).toBeLessThan(bb.maxY);
  });
});

describe("şaft konumu önerisi (sürüm 1.4)", () => {
  it("şaftlar çekirdeğin İÇİNDE kalır", () => {
    const core = rectangle(10, 5, 6, 3);
    const offsets = proposeShaftOffsets(core, 3);
    expect(offsets).toHaveLength(3);
    for (const o of offsets) {
      const abs = shaftAbsolutePosition(core, o[0], o[1]);
      expect(pointInPolygon(abs, core), `şaft dışarıda: ${abs}`).toBe(true);
    }
  });

  it("EŞİT ARALIKLI ve kenarlara yapışmıyor", () => {
    const core = rectangle(0, 0, 8, 4);
    const offsets = proposeShaftOffsets(core, 3);
    const xs = offsets.map((o) => o[0]);
    // Üç şaft: -2, 0, +2 (uzun eksen 8 → t = -0,25 / 0 / +0,25)
    expect(xs[1]! - xs[0]!).toBeCloseTo(xs[2]! - xs[1]!, 6);
    for (const x of xs) expect(Math.abs(x)).toBeLessThan(4);
  });

  it("ÇEKİRDEK TAŞININCA şaftlar birlikte taşınır — offset DEĞİŞMEZ", () => {
    // Düşey sürekliliğin yapısal garantisi: offset göreli olduğu için
    // çekirdeğin nereye gittiği önemli değildir.
    const a = rectangle(0, 0, 6, 3);
    const b = rectangle(50, -20, 6, 3);
    expect(proposeShaftOffsets(a, 2)).toEqual(proposeShaftOffsets(b, 2));

    const off = proposeShaftOffsets(a, 2)[0]!;
    const posA = shaftAbsolutePosition(a, off[0], off[1]);
    const posB = shaftAbsolutePosition(b, off[0], off[1]);
    expect(posB[0] - posA[0]).toBeCloseTo(50, 6);
    expect(posB[1] - posA[1]).toBeCloseTo(-20, 6);
  });

  it("şaft yoksa boş liste — sıfır konumlu şaft üretmez", () => {
    expect(proposeShaftOffsets(rectangle(0, 0, 6, 3), 0)).toEqual([]);
  });
});
