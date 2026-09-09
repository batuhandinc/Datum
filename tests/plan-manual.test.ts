import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  multiPolygonArea,
  polygonArea,
  rectangle,
  rotatePolygon,
  type LocalPoint,
} from "@/lib/geometry";
import {
  applyCuts,
  parseCutLines,
  proposeAssignment,
  remainderOf,
  type CutLine,
} from "@/lib/plan/manual";
import { areaQuantizationBound, asMultiPolygon } from "@/lib/subdivide/kernel";

/**
 * MANUEL BÖLÜMLEME MODU — İP-4'ün RİSK AZALTICISI.
 *
 * `kat-plani-uretim-mimarisi.md` §8.1: "L2 otomatik bölümleme projenin en
 * büyük teknik riskidir." Manuel mod otomatikten ÖNCE yazılır ki otomatik
 * bölümleme gecikse veya kalitesi düşük çıksa bile ürün ayakta kalsın.
 *
 * Kesme çizgisinin serbest poligona üstünlüğü BURADA ölçülür: boşluk ve
 * çakışma yapısal olarak imkânsızdır, denetlenen bir şey değildir.
 */

const PLATE = rectangle(0, 0, 30, 20); // 600 m²
const CORE = rectangle(0, 0, 6, 4); // 24 m²

const vertical = (x: number): CutLine => ({ points: [[x, -12], [x, 12]] });

describe("remainderOf", () => {
  it("plakadan çekirdek ve sirkülasyon düşülür", () => {
    const circulation = [rectangle(0, 8, 20, 2)]; // 40 m²
    const rest = remainderOf(PLATE, CORE, circulation);
    expect(multiPolygonArea(rest)).toBeCloseTo(600 - 24 - 40, 2);
  });

  it("plaka yoksa boş bölge — sıfır DEĞİL, boş", () => {
    const rest = remainderOf(null, CORE, []);
    expect(rest.coordinates).toHaveLength(0);
  });

  it("çekirdek yoksa plakanın tamamı", () => {
    expect(multiPolygonArea(remainderOf(PLATE, null, []))).toBeCloseTo(600, 6);
  });
});

describe("applyCuts", () => {
  const region = remainderOf(PLATE, CORE, []);

  it("tek kesme bölgeyi ikiye böler", () => {
    const result = applyCuts(region, [vertical(-6)]);
    // Çekirdek deliği zaten var; kesme onu iki ayrı parçaya ayırır.
    expect(result.pieces.length).toBeGreaterThanOrEqual(2);
  });

  it("ALAN KORUNUR — bıçak kalınlığı dışında", () => {
    const result = applyCuts(region, [vertical(-6), vertical(6)]);
    const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
    const before = multiPolygonArea(region);
    expect(sum + result.lostArea).toBeCloseTo(before, 6);
  });

  it("bıçak kaybı KUANTALAMA SINIRININ altında ve ÖLÇÜLÜR", () => {
    const result = applyCuts(region, [vertical(-6)]);
    expect(result.lostArea).toBeGreaterThan(0); // gizlenmiyor
    expect(result.lostArea).toBeLessThan(areaQuantizationBound(asMultiPolygon(PLATE)));
  });

  it("BOŞLUK VE ÇAKIŞMA YOK — parçalar bölgeyi tam kaplar", () => {
    const result = applyCuts(region, [vertical(-8), vertical(0), vertical(8)]);
    const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
    // Çakışma olsaydı toplam bölgeden BÜYÜK olurdu; boşluk olsaydı bıçak
    // kaybından fazla küçük olurdu. İkisi de yok.
    expect(sum).toBeLessThanOrEqual(multiPolygonArea(region) + 1e-9);
    expect(sum).toBeGreaterThan(multiPolygonArea(region) - 0.5);
  });

  it("parçalar ALAN AZALAN sırada — deterministik", () => {
    const result = applyCuts(region, [vertical(-10), vertical(10)]);
    const areas = result.pieces.map((p) => polygonArea(p));
    for (let i = 1; i < areas.length; i += 1) {
      expect(areas[i - 1]!).toBeGreaterThanOrEqual(areas[i]!);
    }
  });

  it("KESME YOKSA bölge tek parça + uyarı", () => {
    const result = applyCuts(region, []);
    expect(result.pieces).toHaveLength(1);
    expect(result.lostArea).toBe(0);
    expect(result.warnings.map((w) => w.code)).toContain("PLAN_NO_CUTS");
  });

  it("TEK NOKTALI çizgi kesme değildir — uyarı, çökme yok", () => {
    const result = applyCuts(region, [{ points: [[0, 0]] }]);
    expect(result.warnings.map((w) => w.code)).toContain("PLAN_CUT_INVALID");
    expect(result.pieces).toHaveLength(1);
  });

  it("ÇEKİRDEĞİ KESEN çizgi uyarı üretir ama ENGELLEMEZ", () => {
    // x = 0 çekirdeğin tam ortasından geçer.
    const result = applyCuts(region, [vertical(0)], [CORE]);
    expect(result.warnings.map((w) => w.code)).toContain("PLAN_CUT_CROSSES_CORE");
    // Yine de kalan alanda böler — engellenmedi (ilke 7).
    expect(result.pieces.length).toBeGreaterThanOrEqual(2);
  });

  it("kırık çizgi (çok segmentli) de böler", () => {
    const zigzag: CutLine = { points: [[-12, -12], [-12, 0], [-4, 0], [-4, 12]] };
    const result = applyCuts(region, [zigzag]);
    expect(result.pieces.length).toBeGreaterThanOrEqual(2);
    const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
    expect(sum + result.lostArea).toBeCloseTo(multiPolygonArea(region), 5);
  });

  it("EĞİK plakada da alan korunur", () => {
    const tilted = rotatePolygon(PLATE, 27);
    const r = remainderOf(tilted, null, []);
    const result = applyCuts(r, [{ points: [[-20, -20], [20, 20]] }]);
    const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
    expect(sum + result.lostArea).toBeCloseTo(multiPolygonArea(r), 4);
  });
});

describe("proposeAssignment", () => {
  it("alan azalan ↔ hedef azalan eşleştirir", () => {
    // Dönüş PARÇA indeksiyle indekslenir ve BİRİM indeksi taşır.
    const pieces = [50, 120, 80]; // sıra: 1 (120) > 2 (80) > 0 (50)
    const targets = [100, 60, 75]; // sıra: 0 (100) > 2 (75) > 1 (60)
    // 120 → 100 (birim 0) · 80 → 75 (birim 2) · 50 → 60 (birim 1)
    // Sonuç ÖZDEŞLİK DEĞİL: yanlış bir eşleme sessizce geçemez.
    expect(proposeAssignment(pieces, targets)).toEqual([1, 0, 2]);
  });

  it("HEDEFİ BİLİNMEYEN birim sıralamaya GİRMEZ", () => {
    const pieces = [100, 50];
    const targets = [80, null];
    const result = proposeAssignment(pieces, targets);
    // Yalnızca bilinen hedefli birim eşleşir; ikinci parça boşta kalır.
    expect(result[0]).toBe(0);
    expect(result[1]).toBeNull();
  });

  it("parça birimden çoksa fazlası atanmaz", () => {
    expect(proposeAssignment([100, 80, 60], [90])).toEqual([0, null, null]);
  });

  it("birim parçadan çoksa fazlası boşta kalır", () => {
    const result = proposeAssignment([100], [90, 70, 50]);
    expect(result).toEqual([0]);
  });

  it("DETERMİNİST: eşit alanlarda indeks sırası korunur", () => {
    const a = proposeAssignment([50, 50, 50], [30, 20, 10]);
    const b = proposeAssignment([50, 50, 50], [30, 20, 10]);
    expect(a).toEqual(b);
    expect(a).toEqual([0, 1, 2]);
  });
});

describe("parseCutLines", () => {
  it("geçerli Json'u okur", () => {
    const cuts = parseCutLines([{ points: [[0, 0], [10, 10]] }]);
    expect(cuts).toHaveLength(1);
    expect(cuts[0]!.points[1]).toEqual([10, 10]);
  });

  it("BOZUK Json sessizce boş listeye düşer — fırlatmaz", () => {
    expect(parseCutLines(null)).toEqual([]);
    expect(parseCutLines("bozuk")).toEqual([]);
    expect(parseCutLines([{ points: [[0, 0]] }])).toEqual([]); // tek nokta geçersiz
    expect(parseCutLines([{ points: [[0, Number.NaN], [1, 1]] }])).toEqual([]);
  });
});

describe("property testleri (fast-check)", () => {
  it("ALAN KORUNUMU: kaç kesme olursa olsun Σparça + kayıp = bölge", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -13, max: 13 }), { minLength: 1, maxLength: 5 }),
        (xs) => {
          const region = remainderOf(PLATE, CORE, []);
          const cuts = xs.map((x) => vertical(x));
          const result = applyCuts(region, cuts);
          const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
          expect(Math.abs(sum + result.lostArea - multiPolygonArea(region))).toBeLessThan(0.01);
          return true;
        },
      ),
      { numRuns: 80 },
    );
  });

  it("kesme sayısı arttıkça parça sayısı AZALMAZ", () => {
    fc.assert(
      fc.property(fc.integer({ min: -12, max: -2 }), fc.integer({ min: 2, max: 12 }), (a, b) => {
        const region = remainderOf(PLATE, CORE, []);
        const one = applyCuts(region, [vertical(a)]).pieces.length;
        const two = applyCuts(region, [vertical(a), vertical(b)]).pieces.length;
        expect(two).toBeGreaterThanOrEqual(one);
        return true;
      }),
      { numRuns: 60 },
    );
  });

  it("eşleştirme önerisi ÇAKIŞMAZ — bir birim iki parçaya atanmaz", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 10, max: 300 }), { minLength: 1, maxLength: 8 }),
        fc.array(fc.integer({ min: 10, max: 300 }), { minLength: 1, maxLength: 8 }),
        (pieces, targets) => {
          const result = proposeAssignment(pieces, targets);
          const assigned = result.filter((r): r is number => r !== null);
          expect(new Set(assigned).size).toBe(assigned.length);
          return true;
        },
      ),
      { numRuns: 120 },
    );
  });
});
