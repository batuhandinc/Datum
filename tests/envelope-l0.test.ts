import { describe, expect, it } from "vitest";
import { computeL0, type ConstraintEffect, type L0Input } from "@/lib/envelope/l0";
import { multiPolygonArea, partCount, polygon } from "@/lib/geometry";
import type { LocalPoint } from "@/lib/geometry";
import type { WarningCode } from "@/lib/warnings";

/**
 * L0 ZARF HESABI — İP-2'nin "bitti sayılır" ölçütü:
 * "Parsel ve imar verisi girilince zarf ve azami inşaat alanı doğru çıkıyor."
 */

const L_PARCEL: LocalPoint[] = [
  [0, 0],
  [30, 0],
  [30, 12],
  [12, 12],
  [12, 25],
  [0, 25],
]; // alan 516 m²

const U_PARCEL: LocalPoint[] = [
  [0, 0],
  [30, 0],
  [30, 25],
  [22, 25],
  [22, 6],
  [8, 6],
  [8, 25],
  [0, 25],
];

const SMALL_PARCEL: LocalPoint[] = [
  [0, 0],
  [8, 0],
  [8, 8],
  [0, 8],
];

/** Tüm alanları dolu, uyarısız çalışması beklenen taban girdi. */
function baseInput(overrides: Partial<L0Input> = {}): L0Input {
  return {
    parcelArea: 516,
    parcelGeometry: polygon([L_PARCEL]),
    groundCoverageRatio: 0.5,
    floorAreaRatio: 1.5,
    setbackFront: 3,
    setbackSide: 3,
    setbackRear: 3,
    maxFloorCount: 4,
    maxHeight: 15,
    roadFrontages: [{ edgeIndex: 0, role: "front" }],
    specialConstraints: [],
    offsetJoinType: "miter",
    constraintCatalog: [],
    hasFarExemptionRules: false,
    ...overrides,
  };
}

const codes = (r: { warnings: readonly { code: WarningCode }[] }) =>
  r.warnings.map((x) => x.code);

describe("K1 — skaler mod (poligon yok)", () => {
  it("maxFootprint ve maxTotalFloorArea doğru", () => {
    const r = computeL0(baseInput({ parcelGeometry: null }));

    expect(r.maxFootprint).toBeCloseTo(516 * 0.5, 6);
    expect(r.maxTotalFloorArea).toBeCloseTo(516 * 1.5, 6);
    // Poligon yok → zarf üretilmez, ama SKALER hesap yapılır
    expect(r.buildableEnvelope).toBeNull();
    expect(codes(r)).toContain("PARCEL_GEOMETRY_MISSING");
  });

  it("parsel alanı yoksa hiçbir şey uydurulmuyor", () => {
    const r = computeL0(baseInput({ parcelArea: null, parcelGeometry: null }));
    expect(r.maxFootprint).toBeNull();
    expect(r.maxTotalFloorArea).toBeNull();
    expect(codes(r)).toContain("PARCEL_AREA_MISSING");
  });

  it("TAKS yoksa maxFootprint null, ama emsal hesabı yine yapılır", () => {
    const r = computeL0(baseInput({ groundCoverageRatio: null, parcelGeometry: null }));
    expect(r.maxFootprint).toBeNull();
    expect(r.maxTotalFloorArea).toBeCloseTo(516 * 1.5, 6);
    expect(codes(r)).toContain("GROUND_COVERAGE_RATIO_MISSING");
  });
});

describe("K2+ — geometrik mod", () => {
  it("zarf üretiliyor ve alanı ölçülüyor", () => {
    const r = computeL0(baseInput());
    expect(r.buildableEnvelope).not.toBeNull();
    expect(partCount(r.buildableEnvelope!)).toBe(1);
    // Tüm kenarlar 3 m (ön dahil) → 222,00 m²
    expect(r.envelopeArea).toBeCloseTo(222.0, 2);
  });

  it("kenar bazlı çekme: ön 5 / yan 3 / arka 3", () => {
    const r = computeL0(
      baseInput({
        setbackFront: 5,
        roadFrontages: [{ edgeIndex: 0, role: "front" }],
      }),
    );
    const uniform = computeL0(baseInput()).envelopeArea!;
    // Ön kenar 2 m daha içeride → alan küçülmeli
    expect(r.envelopeArea!).toBeLessThan(uniform);

    const ring = r.buildableEnvelope!.coordinates[0]![0]!;
    expect(Math.min(...ring.map((p) => p[1]))).toBeCloseTo(5, 3);
  });

  it("rol verilmemiş kenarlar 'side' sayılıyor ve UYARI üretiliyor", () => {
    const r = computeL0(baseInput({ roadFrontages: [] }));
    expect(codes(r)).toContain("EDGE_ROLE_DEFAULTED");
    const warning = r.warnings.find((x) => x.code === "EDGE_ROLE_DEFAULTED");
    expect(warning?.params).toMatchObject({ edges: 6, total: 6 });
  });

  it("öteleme parseli BÖLERSE MultiPolygon ve uyarı", () => {
    const r = computeL0(
      baseInput({
        parcelGeometry: polygon([U_PARCEL]),
        parcelArea: 550,
        setbackFront: 3.5,
        setbackSide: 3.5,
        setbackRear: 3.5,
      }),
    );
    expect(partCount(r.buildableEnvelope!)).toBe(2);
    expect(codes(r)).toContain("ENVELOPE_SPLIT");
  });

  it("çekme parseli YOK EDERSE boş sonuç + uyarı, İSTİSNA DEĞİL", () => {
    const r = computeL0(
      baseInput({
        parcelGeometry: polygon([SMALL_PARCEL]),
        parcelArea: 64,
        setbackFront: 5,
        setbackSide: 5,
        setbackRear: 5,
      }),
    );
    expect(r.buildableEnvelope).not.toBeNull();
    expect(partCount(r.buildableEnvelope!)).toBe(0);
    expect(multiPolygonArea(r.buildableEnvelope!)).toBe(0);
    expect(codes(r)).toContain("ENVELOPE_VANISHED");
  });

  it("kendini kesen parsel sınırında zarf HESAPLANMIYOR", () => {
    const bowTie: LocalPoint[] = [[0, 0], [10, 10], [10, 0], [0, 10]];
    const r = computeL0(baseInput({ parcelGeometry: polygon([bowTie]) }));
    expect(r.buildableEnvelope).toBeNull();
    expect(codes(r)).toContain("PARCEL_GEOMETRY_SELF_INTERSECTING");
  });

  it("çekme mesafeleri hiç girilmemişse zarf üretilmiyor", () => {
    const r = computeL0(
      baseInput({ setbackFront: null, setbackSide: null, setbackRear: null }),
    );
    expect(r.buildableEnvelope).toBeNull();
    expect(codes(r)).toContain("SETBACKS_MISSING");
  });
});

describe("ilke 1 — paket boşsa koda gömülü varsayılan YOK", () => {
  it("offsetJoinType yoksa zarf hesaplanmıyor", () => {
    const r = computeL0(baseInput({ offsetJoinType: null }));
    expect(r.buildableEnvelope).toBeNull();
    expect(codes(r)).toContain("OFFSET_JOIN_TYPE_MISSING");

    // Skaler hesap yine de yapılır — ilke 7: engelleme, uyar
    expect(r.maxFootprint).toBeCloseTo(258, 6);
    expect(r.maxTotalFloorArea).toBeCloseTo(774, 6);
  });
});

describe("taban alanı aşımı — sistem KARAR VERMEZ", () => {
  it("zarf TAKS'ı aşınca uyarır ama KIRPMAZ", () => {
    // TAKS 0,4 → izin verilen 206,4 m²; 3 m çekmeli zarf 222,00 m²
    const r = computeL0(baseInput({ groundCoverageRatio: 0.4 }));

    expect(r.maxFootprint).toBeCloseTo(206.4, 4);
    expect(r.envelopeArea).toBeCloseTo(222.0, 2);
    // Zarf ötelenmiş poligon olarak KALIR — sessiz kırpma yok
    expect(r.envelopeArea!).toBeGreaterThan(r.maxFootprint!);

    const warning = r.warnings.find((x) => x.code === "ENVELOPE_EXCEEDS_FOOTPRINT");
    expect(warning).toBeDefined();
    expect(warning?.params).toMatchObject({ envelopeArea: 222, maxFootprint: 206.4 });
  });

  it("zarf TAKS'ın altındaysa uyarı YOK", () => {
    const r = computeL0(baseInput({ groundCoverageRatio: 0.9 }));
    expect(codes(r)).not.toContain("ENVELOPE_EXCEEDS_FOOTPRINT");
  });
});

describe("kat adedi ve bodrum kazanımı (Karar 3)", () => {
  it("maxFloorCount varsa kat adedi ondan gelir", () => {
    const r = computeL0(baseInput({ maxFloorCount: 6 }));
    expect(r.floorCount).toBe(6);
    expect(codes(r)).not.toContain("FLOOR_COUNT_FROM_HEIGHT_UNAVAILABLE");
  });

  it("yalnızca maxHeight varsa kat adedi HESAPLANMAZ, uyarır", () => {
    // Kat yüksekliği A5'te (İP-3). Uydurmak ilke 1 ihlali olurdu.
    const r = computeL0(baseInput({ maxFloorCount: null, maxHeight: 18 }));
    expect(r.floorCount).toBeNull();
    expect(codes(r)).toContain("FLOOR_COUNT_FROM_HEIGHT_UNAVAILABLE");
  });

  it("bodrum kazanımı DAİMA null ve uyarılı", () => {
    const r = computeL0(baseInput());
    expect(r.basementGainFromLevelDifference).toBeNull();
    expect(codes(r)).toContain("BASEMENT_GAIN_NOT_DEFINED");
  });
});

describe("özel kısıtların L0'a etkisi", () => {
  const maniaKotu: ConstraintEffect = {
    ruleKey: "maniaKotu",
    effectTarget: "maxHeight",
    effectKind: "cap",
  };
  const yesilAlanTerki: ConstraintEffect = {
    ruleKey: "yesilAlanTerki",
    effectTarget: "maxFootprint",
    effectKind: "multiply",
  };

  it("mania kotu maxHeight'ı CAPLİYOR", () => {
    const r = computeL0(
      baseInput({
        maxHeight: 24,
        constraintCatalog: [maniaKotu],
        specialConstraints: [{ ruleKey: "maniaKotu", isChecked: true, value: 15.5 }],
      }),
    );
    expect(r.effectiveMaxHeight).toBeCloseTo(15.5, 6);
  });

  it("cap yalnızca KÜÇÜLTÜR — kısıt daha gevşekse yükseklik artmaz", () => {
    const r = computeL0(
      baseInput({
        maxHeight: 12,
        constraintCatalog: [maniaKotu],
        specialConstraints: [{ ruleKey: "maniaKotu", isChecked: true, value: 40 }],
      }),
    );
    expect(r.effectiveMaxHeight).toBeCloseTo(12, 6);
  });

  it("yeşil alan terki maxFootprint'i DÜŞÜRÜYOR", () => {
    const r = computeL0(
      baseInput({
        constraintCatalog: [yesilAlanTerki],
        specialConstraints: [{ ruleKey: "yesilAlanTerki", isChecked: true, value: 0.9 }],
      }),
    );
    expect(r.maxFootprint).toBeCloseTo(516 * 0.5 * 0.9, 4);
  });

  it("işaretlenmemiş kısıt etki ETMEZ", () => {
    const r = computeL0(
      baseInput({
        maxHeight: 24,
        constraintCatalog: [maniaKotu],
        specialConstraints: [{ ruleKey: "maniaKotu", isChecked: false, value: 15.5 }],
      }),
    );
    expect(r.effectiveMaxHeight).toBeCloseTo(24, 6);
  });

  it("işaretli ama DEĞERSİZ kısıt sessizce atlanmıyor", () => {
    // Sessiz atlama iyimser hata olurdu: zarf olduğundan büyük görünürdü.
    const r = computeL0(
      baseInput({
        constraintCatalog: [yesilAlanTerki],
        specialConstraints: [{ ruleKey: "yesilAlanTerki", isChecked: true }],
      }),
    );
    expect(codes(r)).toContain("CONSTRAINT_VALUE_MISSING");
    expect(r.maxFootprint).toBeCloseTo(258, 6);
  });

  it("katalogda olmayan kısıt yok sayılıyor", () => {
    const r = computeL0(
      baseInput({
        constraintCatalog: [],
        specialConstraints: [{ ruleKey: "bilinmeyen", isChecked: true, value: 5 }],
      }),
    );
    expect(codes(r)).not.toContain("CONSTRAINT_VALUE_MISSING");
    expect(r.maxFootprint).toBeCloseTo(258, 6);
  });
});

describe("emsal harici alanlar", () => {
  it("paket kural tanımlıyorsa İP-2 onları hesaba katmadığını UYARIR", () => {
    const r = computeL0(baseInput({ hasFarExemptionRules: true }));
    expect(codes(r)).toContain("FAR_EXEMPTIONS_IGNORED");
    // Değer yine de hesaplanır — engelleme yok
    expect(r.maxTotalFloorArea).toBeCloseTo(774, 6);
  });
});
