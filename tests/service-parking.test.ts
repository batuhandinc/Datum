import { describe, expect, it } from "vitest";
import {
  computeServiceSpaces,
  deriveDrivers,
  type RequiredSpaceRuleInput,
  type ServiceSpaceInput,
} from "@/lib/service-space/engine";
import {
  computeParkingScenarios,
  computeRamp,
  type ParkingRuleInput,
  type ParkingSolverInput,
} from "@/lib/parking/solver";

/**
 * SERVİS MEKANI MOTORU VE OTOPARK ÇÖZÜCÜ.
 *
 * "Bitti sayılır" ölçütünün ikinci ve üçüncü yarısı: "servis mekanları
 * listeleniyor, otopark senaryoları yan yana çıkıyor".
 *
 * Tüm sayılar SENTETİKTİR — gerçek mevzuat değildir.
 */

const COEFFICIENTS = {
  demandPowerPerUnit: 3,
  demandPowerPerCommonArea: 0.02,
  personsPerUnit: 3.5,
};

const RULES: RequiredSpaceRuleInput[] = [
  {
    ruleKey: "shelter",
    serviceSpaceType: "shelter",
    triggerType: "unitCount",
    threshold: 12,
    areaFormula: "personCount * 1",
  },
  {
    ruleKey: "electricalRoom",
    serviceSpaceType: "electricalRoom",
    triggerType: "demandPowerKW",
    threshold: 100,
    areaFormula: "12",
  },
  {
    ruleKey: "firePump",
    serviceSpaceType: "fireSystem",
    triggerType: "buildingHeight",
    threshold: 30.5,
    areaFormula: "20",
  },
];

function serviceInput(o: Partial<ServiceSpaceInput> = {}): ServiceSpaceInput {
  return {
    unitCount: 40,
    totalFloorArea: 4000,
    buildingHeight: 21,
    commonArea: 500,
    rules: RULES,
    coefficients: COEFFICIENTS,
    ...o,
  };
}

describe("türetilmiş sürücüler", () => {
  it("kişi sayısı ve talep gücü katsayılardan türüyor", () => {
    const d = deriveDrivers(serviceInput());
    expect(d.personCount).toBeCloseTo(140, 6); // 40 × 3.5
    expect(d.demandPowerKW).toBeCloseTo(40 * 3 + 500 * 0.02, 6); // 130
  });

  it("katsayı yoksa sürücü null — sıfır DEĞİL", () => {
    // Sıfır saymak "talep gücü yok" demek olurdu ve trafo eşiğini sessizce
    // kaçırırdı.
    const d = deriveDrivers(serviceInput({ coefficients: null }));
    expect(d.personCount).toBeNull();
    expect(d.demandPowerKW).toBeNull();
  });
});

describe("zorunluluk eşikleri", () => {
  it("eşiği geçenler zorunlu, geçmeyenler değil", () => {
    const r = computeServiceSpaces(serviceInput());
    const by = (k: string) => r.requirements.find((x) => x.ruleKey === k)!;

    expect(by("shelter").isMandatory).toBe(true); // 40 ≥ 12
    expect(by("electricalRoom").isMandatory).toBe(true); // 130 ≥ 100
    expect(by("firePump").isMandatory).toBe(false); // 21 < 30.5
  });

  it("neden zorunlu olduğu görünüyor", () => {
    const r = computeServiceSpaces(serviceInput());
    const shelter = r.requirements.find((x) => x.ruleKey === "shelter")!;
    expect(shelter.driverValue).toBe(40);
    expect(shelter.threshold).toBe(12);
  });

  it("alan formülü hesaplanıyor", () => {
    const r = computeServiceSpaces(serviceInput());
    expect(r.requirements.find((x) => x.ruleKey === "shelter")!.requiredArea).toBeCloseTo(140, 6);
  });

  it("zorunlu alanların toplamı otopark için hazır", () => {
    const r = computeServiceSpaces(serviceInput());
    expect(r.mandatoryAreaTotal).toBeCloseTo(140 + 12, 3); // yangın pompası zorunlu değil
  });
});

describe("bilinmeyen tetikleyici sessizce geçmiyor", () => {
  it("tanınmayan tetikleyici uyarı üretiyor ve zorunluluk NULL", () => {
    const r = computeServiceSpaces(
      serviceInput({
        rules: [
          {
            ruleKey: "mystery",
            serviceSpaceType: "wasteRoom",
            triggerType: "moonPhase",
            threshold: 1,
            areaFormula: null,
          },
        ],
      }),
    );
    // "Zorunlu değil" saymak yönetmelik gereğini kaybettirirdi.
    expect(r.requirements[0]!.isMandatory).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("SERVICE_TRIGGER_UNKNOWN");
  });

  it("sürücü değeri yoksa zorunluluk NULL", () => {
    const r = computeServiceSpaces(serviceInput({ coefficients: null }));
    const elec = r.requirements.find((x) => x.ruleKey === "electricalRoom")!;
    expect(elec.isMandatory).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("SERVICE_DRIVER_MISSING");
  });
});

describe("eksik alan toplamı BİLİNMİYOR olarak yayılıyor", () => {
  it("zorunlu bir mekanın alanı hesaplanamazsa toplam null", () => {
    // 0 saymak otopark havuzunu şişirir ve senaryoyu iyimser yapardı.
    const r = computeServiceSpaces(
      serviceInput({
        rules: [
          {
            ruleKey: "shelter",
            serviceSpaceType: "shelter",
            triggerType: "unitCount",
            threshold: 12,
            areaFormula: null,
          },
        ],
      }),
    );
    expect(r.requirements[0]!.isMandatory).toBe(true);
    expect(r.mandatoryAreaTotal).toBeNull();
  });

  it("hiç zorunlu mekan yoksa toplam sıfır", () => {
    const r = computeServiceSpaces(serviceInput({ unitCount: 1, buildingHeight: 3, commonArea: 0 }));
    expect(r.mandatoryAreaTotal).toBe(0);
  });
});

// ============================================================================

const PARKING_RULE: ParkingRuleInput = {
  requirementFormula: "ceil(unitCount * 1)",
  areaPerSpace: 28,
  accessibleAreaPerSpace: 35,
  bicycleAreaPerSpace: 2,
  accessibleRatio: 0.05,
  bicycleRatio: 0.1,
  maxRampSlope: 0.18,
};

function parkingInput(o: Partial<ParkingSolverInput> = {}): ParkingSolverInput {
  return {
    unitCount: 40,
    totalFloorArea: 4000,
    commercialArea: 0,
    residentialUnitCount: 40,
    basementFloorArea: 600,
    serviceSpaceArea: 152,
    coreArea: 15,
    rampFootprintArea: 90,
    rule: PARKING_RULE,
    targetCount: 40,
    ...o,
  };
}

describe("otopark senaryoları", () => {
  it("yan yana birden çok senaryo üretiyor", () => {
    const r = computeParkingScenarios(parkingInput());
    expect(r.requiredCount).toBe(40);
    expect(r.scenarios.length).toBeGreaterThan(1);
    // Bodrum sayısı arttıkça park sayısı artmalı.
    for (let i = 1; i < r.scenarios.length; i++) {
      expect(r.scenarios[i]!.plannedCount).toBeGreaterThan(r.scenarios[i - 1]!.plannedCount);
    }
  });

  it("ihtiyaç karşılanınca duruyor", () => {
    const r = computeParkingScenarios(parkingInput());
    const last = r.scenarios[r.scenarios.length - 1]!;
    expect(last.meetsRequirement).toBe(true);
    // Bir öncekinde karşılanmıyor olmalı — yani gereksiz senaryo üretmiyoruz.
    if (r.scenarios.length > 1) {
      expect(r.scenarios[r.scenarios.length - 2]!.meetsRequirement).toBe(false);
    }
  });

  it("eksikli senaryo eksiği SAYIYLA gösteriyor", () => {
    const r = computeParkingScenarios(parkingInput());
    const first = r.scenarios[0]!;
    expect(first.deficitCount).toBeGreaterThan(0);
    expect(first.deficitCount).toBe(40 - first.plannedCount);
  });

  it("SİSTEM SEÇMİYOR — hiçbir senaryo işaretli değil", () => {
    const r = computeParkingScenarios(parkingInput());
    // Çıktıda "seçili" diye bir alan yok; seçim üst katmanda ve bir ezme.
    expect(Object.keys(r.scenarios[0]!)).not.toContain("isSelected");
  });
});

describe("SIRA: servis mekanları önce, kalan alan otoparka", () => {
  it("servis alanı arttıkça park sayısı azalıyor", () => {
    const az = computeParkingScenarios(parkingInput({ serviceSpaceArea: 50 }));
    const cok = computeParkingScenarios(parkingInput({ serviceSpaceArea: 300 }));
    expect(cok.scenarios[0]!.plannedCount).toBeLessThan(az.scenarios[0]!.plannedCount);
  });

  it("rampa ayak izi havuzdan düşülüyor", () => {
    const rampasiz = computeParkingScenarios(parkingInput({ rampFootprintArea: 0 }));
    const rampali = computeParkingScenarios(parkingInput({ rampFootprintArea: 200 }));
    expect(rampali.scenarios[0]!.usableArea).toBeLessThan(rampasiz.scenarios[0]!.usableArea);
  });

  it("çekirdek HER katta yer kaplıyor", () => {
    const r = computeParkingScenarios(parkingInput({ coreArea: 100 }));
    const s1 = r.scenarios[0]!;
    const s2 = r.scenarios[1]!;
    // İkinci kat 600 brüt ekliyor ama 100 de çekirdeğe gidiyor.
    expect(s2.usableArea - s1.usableArea).toBeCloseTo(600 - 100, 6);
  });

  it("servis alanı BİLİNMİYORSA senaryo üretilmiyor", () => {
    const r = computeParkingScenarios(parkingInput({ serviceSpaceArea: null }));
    expect(r.scenarios).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_SERVICE_AREA_UNKNOWN");
  });

  it("rampa ayak izi BİLİNMİYORSA senaryo üretilmiyor", () => {
    // Aynı gerekçe: bilinmeyeni 0 saymak havuzu şişirir ve senaryoyu
    // iyimser yapardı. 0 "rampa yok" demektir, "bilmiyorum" değil.
    const r = computeParkingScenarios(parkingInput({ rampFootprintArea: null }));
    expect(r.scenarios).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_RAMP_AREA_UNKNOWN");
  });

  it("rampa ayak izi SIFIR ise senaryo üretiliyor", () => {
    const r = computeParkingScenarios(parkingInput({ rampFootprintArea: 0 }));
    expect(r.scenarios.length).toBeGreaterThan(0);
    expect(r.warnings.map((w) => w.code)).not.toContain("PARKING_RAMP_AREA_UNKNOWN");
  });
});

describe("kural yoksa sayım yapılmıyor (ilke 1)", () => {
  it("areaPerSpace yoksa senaryo yok", () => {
    const r = computeParkingScenarios(
      parkingInput({ rule: { ...PARKING_RULE, areaPerSpace: null } }),
    );
    expect(r.scenarios).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_AREA_PER_SPACE_MISSING");
    // İhtiyaç yine de hesaplanmış olmalı — kısmi sonuç kaybolmuyor.
    expect(r.requiredCount).toBe(40);
  });

  it("ParkingRule yoksa hiçbir şey hesaplanmıyor", () => {
    const r = computeParkingScenarios(parkingInput({ rule: null }));
    expect(r.requiredCount).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_RULE_MISSING");
  });

  it("engelli ve bisiklet KENDİ katsayılarıyla düşülüyor", () => {
    const ucuz = computeParkingScenarios(
      parkingInput({ rule: { ...PARKING_RULE, accessibleAreaPerSpace: 28 } }),
    );
    const pahali = computeParkingScenarios(
      parkingInput({ rule: { ...PARKING_RULE, accessibleAreaPerSpace: 60 } }),
    );
    expect(pahali.scenarios[0]!.plannedCount).toBeLessThan(ucuz.scenarios[0]!.plannedCount);
  });
});

describe("korkuluk", () => {
  it("ihtiyaç karşılanmazsa sınıra kadar deniyor ve uyarıyor", () => {
    const r = computeParkingScenarios(
      parkingInput({ unitCount: 5000, basementFloorArea: 200, maxBasementFloors: 3 }),
    );
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_LIMIT_REACHED");
    expect(r.scenarios.length).toBeGreaterThan(0);
    expect(r.scenarios.every((s) => s.meetsRequirement)).toBe(false);
  });

  it("alanı yetmeyen bodrum sayısı senaryo olarak SUNULMUYOR", () => {
    // 1 bodrum: 200 brüt − 152 servis − 15 çekirdek − 90 rampa < 0.
    // Eksi alanlı bir senaryo sunmak anlamsız olurdu; listenin 2'den
    // başlaması "1 bodrum mümkün değil" demektir.
    const r = computeParkingScenarios(
      parkingInput({ unitCount: 5000, basementFloorArea: 200, maxBasementFloors: 3 }),
    );
    expect(r.scenarios[0]!.basementFloorCount).toBe(2);
    expect(r.scenarios.every((s) => s.usableArea > 0)).toBe(true);
  });

  it("alan hiç kalmıyorsa senaryo yok + uyarı", () => {
    const r = computeParkingScenarios(
      parkingInput({ basementFloorArea: 50, serviceSpaceArea: 400, maxBasementFloors: 2 }),
    );
    expect(r.scenarios).toHaveLength(0);
    expect(r.warnings.map((w) => w.code)).toContain("PARKING_NO_SCENARIO");
  });
});

describe("rampa", () => {
  it("uzunluk = bodrum derinliği ÷ eğim", () => {
    const r = computeRamp({
      basementFloorCount: 2,
      basementFloorHeight: 2.7,
      maxRampSlope: 0.18,
      width: 5,
    });
    expect(r.length).toBeCloseTo((2 * 2.7) / 0.18, 3); // 30 m
    expect(r.footprintArea).toBeCloseTo(30 * 5, 3);
  });

  it("bodrum derinleştikçe rampa uzuyor", () => {
    const bir = computeRamp({ basementFloorCount: 1, basementFloorHeight: 3, maxRampSlope: 0.15, width: 5 });
    const uc = computeRamp({ basementFloorCount: 3, basementFloorHeight: 3, maxRampSlope: 0.15, width: 5 });
    expect(uc.length!).toBeCloseTo(bir.length! * 3, 6);
  });

  it("eğim sınırı yoksa hesaplanmıyor", () => {
    const r = computeRamp({ basementFloorCount: 2, basementFloorHeight: 3, maxRampSlope: null, width: 5 });
    expect(r.length).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("RAMP_SLOPE_MISSING");
  });

  it("genişlik yoksa uzunluk yine hesaplanıyor, ayak izi hesaplanmıyor", () => {
    const r = computeRamp({ basementFloorCount: 1, basementFloorHeight: 3, maxRampSlope: 0.2, width: null });
    expect(r.length).toBeCloseTo(15, 6);
    expect(r.footprintArea).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("RAMP_WIDTH_MISSING");
  });
});
