import { describe, expect, it } from "vitest";
import { polygonArea, rectangle, rotatePolygon } from "@/lib/geometry";
import { computeL2, type L2Input } from "@/lib/plan/l2";
import { checkSubdivision, facadeSegments } from "@/lib/subdivide/check";
import { areaQuantizationBound, asMultiPolygon } from "@/lib/subdivide/kernel";

/**
 * L2 OTOMATİK BÖLÜMLEME.
 *
 * En kritik davranış: SİSTEM PROGRAMI ÖLÇEKLEMEZ. Panelin üç tasarımının
 * üçünde de bulunan `hedef_i = kalan × hedef_i / Σhedef` normalizasyonu
 * plakayı daima tam tüketir ve alan toleransı kontrolünü ölçülemez kılar.
 * Aşağıdaki iki test bunu kilitliyor: program küçükse ARTIK kalır, büyükse
 * birimler YERLEŞMEZ — ikisinde de hedefler olduğu gibi durur.
 */

const PLATE = rectangle(0, 0, 40, 20); // 800 m²
const CORE = rectangle(0, 0, 8, 5); // 40 m²

function input(over: Partial<L2Input> = {}): L2Input {
  return {
    plate: PLATE,
    core: CORE,
    coreStrategy: "merkezi",
    minCirculationWidth: 1.4,
    grossToNetFactor: 1.25,
    units: [],
    ...over,
  };
}

const unit = (id: string, targetArea: number | null) => ({
  unitId: id,
  unitNo: id,
  targetArea,
});

describe("normalizasyon YOK", () => {
  it("program plakadan KÜÇÜKSE artık kalır, hedefler ŞİŞMEZ", () => {
    // 4 × 100 net = 400 net → 500 brüt. Kalan alan 760 m².
    const out = computeL2(
      input({ units: [unit("1", 100), unit("2", 100), unit("3", 100), unit("4", 100)] }),
    );

    const placed = out.placements.filter((p) => p.geometry !== null);
    expect(placed).toHaveLength(4);

    for (const p of placed) {
      // Her birim KENDİ brüt hedefine (125 m²) yakın olmalı — 190'a şişmemeli.
      expect(polygonArea(p.geometry!)).toBeGreaterThan(120);
      expect(polygonArea(p.geometry!)).toBeLessThan(131);
    }
    // Artan alan ARTIK olarak durur, dairelere dağıtılmaz.
    expect(out.residualArea!).toBeGreaterThan(200);
  });

  it("program plakadan BÜYÜKSE kuyruktaki birimler YERLEŞMEZ", () => {
    // 8 × 200 net = 1600 net → 2000 brüt; kalan alan yalnızca 760 m².
    const units = Array.from({ length: 8 }, (_, i) => unit(String(i + 1), 200));
    const out = computeL2(input({ units }));

    const placed = out.placements.filter((p) => p.geometry !== null);
    const unplaced = out.placements.filter((p) => p.geometry === null);
    expect(unplaced.length).toBeGreaterThan(0);
    // Yerleşenler hedeflerini tutturmuş olmalı — küçültülmemiş.
    for (const p of placed) {
      expect(polygonArea(p.geometry!)).toBeGreaterThan(230);
    }
  });

  it("HEDEFİ BİLİNMEYEN birim yerleşmez ve DİĞERLERİNİ etkilemez", () => {
    const out = computeL2(input({ units: [unit("1", 100), unit("2", null), unit("3", 100)] }));

    const byId = new Map(out.placements.map((p) => [p.unitId, p]));
    expect(byId.get("2")!.geometry).toBeNull();

    // Bilinen hedefliler hedeflerini tutturur — bilinmeyenin payı onlara
    // dağıtılmaz (dağıtılsaydı 125 yerine ~190 çıkarlardı).
    for (const id of ["1", "3"]) {
      const area = polygonArea(byId.get(id)!.geometry!);
      expect(area).toBeGreaterThan(120);
      expect(area).toBeLessThan(131);
    }
  });
});

describe("kural yoksa hesaplanmaz", () => {
  it("BRÜT/NET katsayısı yoksa bölümleme YAPILMAZ", () => {
    const out = computeL2(input({ grossToNetFactor: null, units: [unit("1", 100)] }));
    expect(out.placements).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L2_GROSS_TO_NET_MISSING");
  });

  it("ÇİFT ÇEKİRDEK uygulanamaz — tek çekirdek gibi davranılmaz", () => {
    const out = computeL2(input({ coreStrategy: "cift", units: [unit("1", 100)] }));
    expect(out.placements).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L2_DOUBLE_CORE_UNSUPPORTED");
  });

  it("kenar stratejisinde koridor genişliği yoksa hesaplanmaz", () => {
    const out = computeL2(
      input({ coreStrategy: "kenar", minCirculationWidth: null, units: [unit("1", 100)] }),
    );
    expect(out.placements).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("CORE_RULE_MISSING");
  });

  it("plaka yoksa hesaplanmaz", () => {
    const out = computeL2(input({ plate: null, units: [unit("1", 100)] }));
    expect(out.warnings.map((w) => w.code)).toContain("PLAN_PLATE_MISSING");
  });

  it("çekirdek yoksa hesaplanmaz", () => {
    const out = computeL2(input({ core: null, units: [unit("1", 100)] }));
    expect(out.warnings.map((w) => w.code)).toContain("PLAN_CORE_MISSING");
  });
});

describe("merkezî çekirdek — kama süpürmesi", () => {
  it("her dilim ÇEKİRDEĞE değer: erişim çözümün TANIMI", () => {
    const units = [unit("1", 90), unit("2", 90), unit("3", 90), unit("4", 90)];
    const out = computeL2(input({ units }));

    const report = checkSubdivision({
      plate: PLATE,
      core: CORE,
      circulation: out.circulation,
      facade: facadeSegments(PLATE),
      units: units.map((u) => ({
        unitId: u.unitId,
        unitNo: u.unitNo,
        targetArea: u.targetArea,
        geometry: out.placements.find((p) => p.unitId === u.unitId)!.geometry,
      })),
      rule: null,
    });

    for (const u of report.units) {
      const access = u.checks.find((c) => c.constraint === "coreAccess")!;
      expect(access.state, `${u.unitNo} çekirdeğe değmiyor`).toBe("saglandi");
    }
  });

  it("her dilim CEPHEYE de değer", () => {
    const units = [unit("1", 90), unit("2", 90), unit("3", 90)];
    const out = computeL2(input({ units }));

    const report = checkSubdivision({
      plate: PLATE,
      core: CORE,
      circulation: out.circulation,
      facade: facadeSegments(PLATE),
      units: units.map((u) => ({
        unitId: u.unitId,
        unitNo: u.unitNo,
        targetArea: u.targetArea,
        geometry: out.placements.find((p) => p.unitId === u.unitId)!.geometry,
      })),
      rule: null,
    });

    for (const u of report.units) {
      expect(u.checks.find((c) => c.constraint === "facade")!.state).toBe("saglandi");
    }
  });
});

describe("kenar çekirdek — bant ve omurga", () => {
  it("SİRKÜLASYON üretilir ve plakanın içinde kalır", () => {
    const out = computeL2(input({ coreStrategy: "kenar", units: [unit("1", 90), unit("2", 90)] }));
    expect(out.circulation.length).toBeGreaterThan(0);
    const total = out.circulation.reduce((s, c) => s + polygonArea(c), 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(polygonArea(PLATE));
  });

  it("EĞİK plakada omurga ana eksene oturur — testere dişi yok", () => {
    const tilted = rotatePolygon(PLATE, 35);
    const tiltedCore = rotatePolygon(CORE, 35);
    const out = computeL2(
      input({
        plate: tilted,
        core: tiltedCore,
        coreStrategy: "kenar",
        units: [unit("1", 90), unit("2", 90)],
      }),
    );
    expect(out.circulation.length).toBeGreaterThan(0);
    // Omurga plakanın uzun ekseni boyunca uzandığı için alanı koridor
    // genişliği × plaka uzunluğu mertebesinde olmalı (1,4 × ~40 ≈ 56).
    const total = out.circulation.reduce((s, c) => s + polygonArea(c), 0);
    expect(total).toBeGreaterThan(40);
    expect(total).toBeLessThan(70);
  });
});

describe("alan korunumu ve determinizm", () => {
  it("Σbirim + çekirdek + sirkülasyon + artık = plaka", () => {
    const units = [unit("1", 100), unit("2", 80), unit("3", 60)];
    const out = computeL2(input({ units }));

    const unitArea = out.placements.reduce(
      (s, p) => s + (p.geometry ? polygonArea(p.geometry) : 0),
      0,
    );
    const circulationArea = out.circulation.reduce((s, c) => s + polygonArea(c), 0);
    const total = unitArea + polygonArea(CORE) + circulationArea + out.residualArea!;

    expect(Math.abs(total - polygonArea(PLATE))).toBeLessThan(
      areaQuantizationBound(asMultiPolygon(PLATE)),
    );
  });

  it("DETERMİNİST: aynı girdi iki kez → birebir aynı poligonlar", () => {
    const units = [unit("1", 110), unit("2", 95), unit("3", 70)];
    const a = computeL2(input({ units }));
    const b = computeL2(input({ units }));
    expect(JSON.stringify(a.placements)).toBe(JSON.stringify(b.placements));
    expect(a.residualArea).toBe(b.residualArea);
  });

  it("çıktı sırası GİRDİ sırasıdır — kesim sırası dışarı sızmaz", () => {
    const units = [unit("kucuk", 50), unit("buyuk", 150), unit("orta", 90)];
    const out = computeL2(input({ units }));
    expect(out.placements.map((p) => p.unitId)).toEqual(["kucuk", "buyuk", "orta"]);
  });

  it("birim yoksa plaka tamamen artıktır", () => {
    const out = computeL2(input({ units: [] }));
    expect(out.residualArea).toBeCloseTo(polygonArea(PLATE), 2);
  });
});

describe("checkSubdivision ile birlikte", () => {
  it("otomatik çıktı KENDİ doğrulayıcısından geçer ve tanı üretir", () => {
    const units = [unit("1", 100), unit("2", 100)];
    const out = computeL2(input({ units }));

    const report = checkSubdivision({
      plate: PLATE,
      core: CORE,
      circulation: out.circulation,
      facade: facadeSegments(PLATE),
      units: units.map((u) => ({
        unitId: u.unitId,
        unitNo: u.unitNo,
        targetArea: u.targetArea,
        geometry: out.placements.find((p) => p.unitId === u.unitId)!.geometry,
      })),
      rule: {
        grossToNetFactor: 1.25,
        areaTolerance: 0.05,
        minUnitFacadeLength: 3,
        maxUnitAspectRatio: 4,
      },
    });

    // Kesim hedefe göre yapıldığı için alan toleransı SAĞLANMALI.
    for (const u of report.units) {
      expect(u.checks.find((c) => c.constraint === "areaTolerance")!.state).toBe("saglandi");
    }
  });
});
