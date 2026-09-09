import { describe, expect, it } from "vitest";
import { rectangle, rotatePolygon, type LocalPolygon } from "@/lib/geometry";
import {
  checkSubdivision,
  facadeSegments,
  type ConstraintKind,
  type SubdivisionInput,
  type UnitLayoutRuleInput,
} from "@/lib/subdivide/check";
import { outerSegments } from "@/lib/subdivide/boundary";

/**
 * BÖLÜMLEME DOĞRULAYICISI.
 *
 * En önemli iki davranış:
 *   1. Eksik kural "sağlandı" ÜRETMEZ — "değerlendirilemedi" üretir.
 *   2. Kuralsız bilinen olgu (temas var mı) paket boşken bile İHLAL üretir.
 *
 * İkisi birlikte, boş bir pakette kapısız ve penceresiz bir dairenin
 * `violations: []` ile teslim edilmesini engeller.
 */

// 30×20 plaka; çekirdek ortada 6×4.
const PLATE = rectangle(0, 0, 30, 20);
const CORE = rectangle(0, 0, 6, 4);

const FULL_RULE: UnitLayoutRuleInput = {
  grossToNetFactor: 1.25,
  areaTolerance: 0.05,
  minUnitFacadeLength: 3,
  maxUnitAspectRatio: 3,
};

const stateOf = (
  report: ReturnType<typeof checkSubdivision>,
  unitIndex: number,
  kind: ConstraintKind,
) => report.units[unitIndex]!.checks.find((c) => c.constraint === kind)!.state;

function input(over: Partial<SubdivisionInput>): SubdivisionInput {
  return {
    plate: PLATE,
    core: CORE,
    circulation: [],
    facade: facadeSegments(PLATE),
    units: [],
    rule: FULL_RULE,
    ...over,
  };
}

/** Çekirdeğe değen, cephesi olan makul bir birim. */
const goodUnit = (id: string, geometry: LocalPolygon, targetArea: number | null) => ({
  unitId: id,
  unitNo: id,
  targetArea,
  geometry,
});

describe("üç durumlu tanı", () => {
  it("KURAL YOKSA hüküm gerektiren kısıtlar `degerlendirilemedi` — `saglandi` DEĞİL", () => {
    const unit = goodUnit("1", rectangle(-12, 0, 6, 20), 80);
    const report = checkSubdivision(input({ units: [unit], rule: null }));

    expect(stateOf(report, 0, "facadeLength")).toBe("degerlendirilemedi");
    expect(stateOf(report, 0, "areaTolerance")).toBe("degerlendirilemedi");
    expect(stateOf(report, 0, "aspectRatio")).toBe("degerlendirilemedi");
    expect(report.warnings.map((w) => w.code)).toContain("UNIT_LAYOUT_RULE_MISSING");
  });

  it("KURALSIZ OLGULAR paket boşken bile ölçülür", () => {
    // Sağ kenarı çekirdeğin sol kenarına (x = -3) dayanan, sol kenarı plakanın
    // cephesine (x = -15) oturan birim: kural olmasa da her iki olgu SAĞLANDI.
    const touching = goodUnit("1", rectangle(-9, 0, 12, 20), 192);
    const report = checkSubdivision(input({ units: [touching], rule: null }));

    expect(stateOf(report, 0, "coreAccess")).toBe("saglandi");
    expect(stateOf(report, 0, "facade")).toBe("saglandi");
  });

  it("çekirdeğe DEĞMEYEN birim, plakanın içinde olsa bile ihlal", () => {
    // x ∈ [-15, -9]; çekirdek x ∈ [-3, 3] — arada 6 m boşluk var.
    const detached = goodUnit("1", rectangle(-12, 0, 6, 20), 96);
    const report = checkSubdivision(input({ units: [detached], rule: null }));
    expect(stateOf(report, 0, "coreAccess")).toBe("ihlal");
    // Cephesi var ama kapısı yok — iki olgu BİRBİRİNDEN BAĞIMSIZ ölçülür.
    expect(stateOf(report, 0, "facade")).toBe("saglandi");
  });

  it("KAPISIZ birim paket boşken bile İHLAL — sessiz yeşil ışık yok", () => {
    // Plakanın içinde ama çekirdeğe değmeyen bir birim.
    const island = rectangle(10, 0, 4, 4);
    const report = checkSubdivision(input({ units: [goodUnit("1", island, 20)], rule: null }));

    expect(stateOf(report, 0, "coreAccess")).toBe("ihlal");
    expect(report.warnings.map((w) => w.code)).toContain("L2_UNIT_NO_CORE_ACCESS");
  });

  it("PENCERESİZ birim paket boşken bile İHLAL", () => {
    const island = rectangle(10, 0, 4, 4); // hiçbir dış kenara değmiyor
    const report = checkSubdivision(input({ units: [goodUnit("1", island, 20)], rule: null }));

    expect(stateOf(report, 0, "facade")).toBe("ihlal");
    expect(report.warnings.map((w) => w.code)).toContain("L2_UNIT_NO_FACADE");
  });

  it("ÇEKİRDEK ÜRETİLEMEMİŞSE erişim ölçülemez — ihlal değil", () => {
    const unit = goodUnit("1", rectangle(-12, 0, 6, 20), 80);
    const report = checkSubdivision(input({ units: [unit], core: null }));
    expect(stateOf(report, 0, "coreAccess")).toBe("degerlendirilemedi");
  });
});

describe("hüküm gerektiren kısıtlar", () => {
  it("cephe kısa ise ihlal, uzun ise sağlandı", () => {
    // Sol kenara oturan 6×20 birim: cephe teması 20 m.
    const wide = checkSubdivision(input({ units: [goodUnit("1", rectangle(-12, 0, 6, 20), 96)] }));
    expect(stateOf(wide, 0, "facadeLength")).toBe("saglandi");

    // Cephesi yalnızca 2 m olan ince birim (asgari 3 m).
    const narrow = rectangle(-14, 0, 2, 2);
    const thin = checkSubdivision(input({ units: [goodUnit("1", narrow, 3)] }));
    expect(stateOf(thin, 0, "facadeLength")).toBe("ihlal");
    expect(thin.warnings.map((w) => w.code)).toContain("L2_UNIT_FACADE_SHORT");
  });

  it("EN-BOY ORANI eğik birimde de doğru ölçülür", () => {
    // 18×3 birim, oran 6 → sınır 3'ü aşıyor.
    const tilted = rotatePolygon(rectangle(0, 0, 18, 3), 40);
    const report = checkSubdivision(input({ units: [goodUnit("1", tilted, 40)] }));
    expect(stateOf(report, 0, "aspectRatio")).toBe("ihlal");
    const check = report.units[0]!.checks.find((c) => c.constraint === "aspectRatio")!;
    expect(check.measured).toBeCloseTo(6, 1);
  });

  it("alan hedefi BRÜT'e çevrilir — katsayı olmadan hüküm verilmez", () => {
    // Net hedef 80, katsayı 1,25 → brüt hedef 100. Birim tam 100 m².
    const unit = goodUnit("1", rectangle(-10, 0, 10, 10), 80);
    const report = checkSubdivision(input({ units: [unit] }));
    expect(report.units[0]!.grossTarget).toBeCloseTo(100, 6);
    expect(stateOf(report, 0, "areaTolerance")).toBe("saglandi");

    // Katsayı yoksa: brüt hedef null, hüküm verilemez, uyarı çıkar.
    const noFactor = checkSubdivision(
      input({ units: [unit], rule: { ...FULL_RULE, grossToNetFactor: null } }),
    );
    expect(noFactor.units[0]!.grossTarget).toBeNull();
    expect(stateOf(noFactor, 0, "areaTolerance")).toBe("degerlendirilemedi");
    expect(noFactor.warnings.map((w) => w.code)).toContain("L2_GROSS_TO_NET_MISSING");
  });

  it("tolerans dışı alan ihlal üretir", () => {
    // Net hedef 80 → brüt 100; birim 140 m² (%40 sapma, sınır %5).
    const unit = goodUnit("1", rectangle(-8, 0, 14, 10), 80);
    const report = checkSubdivision(input({ units: [unit] }));
    expect(stateOf(report, 0, "areaTolerance")).toBe("ihlal");
    expect(report.warnings.map((w) => w.code)).toContain("L2_UNIT_AREA_OFF_TARGET");
  });

  it("KUANTALAMA GÜRÜLTÜSÜ sahte alan uyarısı üretmez", () => {
    // Eğik birim: mm ızgarasında alanı birkaç santimetrekare sapar.
    const tilted = rotatePolygon(rectangle(0, 0, 10, 10), 33);
    // Net hedef tam brüt alanı verecek şekilde seçildi (100 / 1,25 = 80).
    const report = checkSubdivision(
      input({
        plate: rectangle(0, 0, 40, 40),
        facade: facadeSegments(rectangle(0, 0, 40, 40)),
        core: null,
        units: [goodUnit("1", tilted, 80)],
        rule: { ...FULL_RULE, areaTolerance: 0.0001 }, // ÇOK dar tolerans
      }),
    );
    // Tolerans yüzbinde bir olmasına rağmen gürültü ihlal üretmemeli.
    expect(stateOf(report, 0, "areaTolerance")).toBe("saglandi");
  });
});

describe("bilinmeyen ≠ sıfır", () => {
  it("HEDEFİ BİLİNMEYEN birim uyarı üretir ve hüküm verilmez", () => {
    const unit = goodUnit("1", rectangle(-12, 0, 6, 20), null);
    const report = checkSubdivision(input({ units: [unit] }));

    expect(report.units[0]!.targetArea).toBeNull();
    expect(report.units[0]!.grossTarget).toBeNull();
    expect(stateOf(report, 0, "areaTolerance")).toBe("degerlendirilemedi");
    expect(report.warnings.map((w) => w.code)).toContain("L2_UNIT_TARGET_UNKNOWN");
  });

  it("bilinmeyen hedef DİĞER birimlerin hükmünü etkilemez", () => {
    const known = goodUnit("1", rectangle(-10, 0, 10, 10), 80); // brüt hedef 100, alan 100
    const unknown = goodUnit("2", rectangle(10, 0, 10, 10), null);
    const report = checkSubdivision(input({ units: [known, unknown] }));

    // Bilinen birim hâlâ SAĞLANDI — ölçekleme yok, komşusundan etkilenmiyor.
    expect(stateOf(report, 0, "areaTolerance")).toBe("saglandi");
    expect(report.units[0]!.grossTarget).toBeCloseTo(100, 6);
  });
});

describe("yerleşemeyen birim ve artık", () => {
  it("YERLEŞMEYEN birim SATIRINI KORUR — sessiz kayıp yok", () => {
    const report = checkSubdivision(
      input({
        units: [
          goodUnit("1", rectangle(-12, 0, 6, 20), 80),
          { unitId: "2", unitNo: "2", targetArea: 90, geometry: null },
        ],
      }),
    );

    expect(report.units).toHaveLength(2);
    expect(report.units[1]!.placed).toBe(false);
    expect(report.units[1]!.achievedArea).toBeNull();
    // Hedef bilgisi KORUNUR — kullanıcı neyin yerleşmediğini görür.
    expect(report.units[1]!.targetArea).toBe(90);
    expect(report.warnings.map((w) => w.code)).toContain("L2_UNIT_UNPLACED");
    expect(report.warnings.map((w) => w.code)).toContain("L2_PROGRAM_EXCEEDS_PLATE");
  });

  it("ARTIK ALAN raporlanır — hiçbir m² sessizce buharlaşmaz", () => {
    // Plaka 600, çekirdek 24, birim 120 → artık 456.
    const report = checkSubdivision(input({ units: [goodUnit("1", rectangle(-12, 0, 6, 20), 96)] }));
    expect(report.residualArea).toBeCloseTo(600 - 24 - 120, 1);
    expect(report.warnings.map((w) => w.code)).toContain("L2_RESIDUAL_AREA");
  });

  it("plaka tam kaplanmışsa artık SIFIR ve uyarı YOK", () => {
    // Çekirdeksiz 10×10 plaka, tek birim tamamını kaplıyor.
    const plate = rectangle(0, 0, 10, 10);
    const report = checkSubdivision(
      input({
        plate,
        core: null,
        facade: facadeSegments(plate),
        units: [goodUnit("1", plate, 80)],
      }),
    );
    expect(report.residualArea).toBe(0);
    expect(report.coverageRatio).toBeCloseTo(1, 4);
    expect(report.warnings.map((w) => w.code)).not.toContain("L2_RESIDUAL_AREA");
  });
});

describe("cephe sınıflandırması", () => {
  it("ORTAK DUVAR kenarı cepheden çıkarılır", () => {
    const all = outerSegments(PLATE);
    // 0 numaralı kenarı ortak duvar say.
    const filtered = facadeSegments(PLATE, [0]);
    expect(filtered).toHaveLength(all.length - 1);
  });

  it("ortak duvara oturan birim CEPHESİZ sayılır", () => {
    // Alt kenar (indeks 0) ortak duvar; birim yalnızca ona değiyor.
    const alongBottom = rectangle(0, -9, 8, 2); // y ∈ [-10, -8]
    const report = checkSubdivision(
      input({ units: [goodUnit("1", alongBottom, 20)], facade: facadeSegments(PLATE, [0]) }),
    );
    expect(stateOf(report, 0, "facade")).toBe("ihlal");
  });
});

describe("ENGELLEMEZ, UYARIR (ilke 7)", () => {
  it("her kısıtı ihlal eden bir bölümleme bile rapor üretir, fırlatmaz", () => {
    const island = rotatePolygon(rectangle(12, 0, 18, 1), 20); // kapısız, penceresiz, aşırı ince
    expect(() =>
      checkSubdivision(input({ units: [goodUnit("1", island, null)] })),
    ).not.toThrow();

    const report = checkSubdivision(input({ units: [goodUnit("1", island, null)] }));
    expect(report.units).toHaveLength(1);
    expect(report.warnings.length).toBeGreaterThan(2);
  });

  it("birim yoksa rapor boş ama geçerli", () => {
    const report = checkSubdivision(input({ units: [] }));
    expect(report.units).toHaveLength(0);
    expect(report.residualArea).toBeCloseTo(600 - 24, 1);
  });
});
