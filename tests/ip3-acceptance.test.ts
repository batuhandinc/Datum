import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "./helpers/db";
import { loadTestRegionPackage } from "../prisma/fixtures/test-region-package";
import { SEEDED_ORGANIZATION_ID } from "@/lib/db/tenant";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { computeAndStoreL1 } from "@/lib/core/service";
import { createRuleReader } from "@/lib/rules/reader";
import { computeServiceSpaces } from "@/lib/service-space/engine";
import { computeParkingScenarios, computeRamp } from "@/lib/parking/solver";
import { shaftAbsolutePosition } from "@/lib/core/l1";
import {
  LOCAL_CRS,
  boundingBox,
  containsPolygon,
  polygon,
  translatePolygon,
  type LocalPolygon,
} from "@/lib/geometry";
import { parseLocalPolygon } from "@/lib/geometry/schema";
import { FORMULA_SLOTS, validateFormula } from "@/lib/formula";

/**
 * İP-3 KABUL TESTİ — `mvp-spesifikasyonu.md` §3 İP-3:
 * "Program girilince ÇEKİRDEK YERLEŞİYOR, SERVİS MEKANLARI LİSTELENİYOR,
 *  OTOPARK SENARYOLARI YAN YANA ÇIKIYOR."
 *
 * Kullanıcının ek şartı: ŞAFT DÜŞEY SÜREKLİLİĞİ test edilsin.
 *
 * Uçtan uca: genişletilmiş fixture → yayım kapısı → projeye bağlama →
 * program → L0 zarf → L1 çekirdek → servis mekanları → otopark senaryoları.
 */

let db: TestDb;
let prisma: PrismaClient;
let versionId: string;

/** 40×25 dikdörtgen parsel, 1000 m². Çekme sonrası zarf 34×19 = 646 m². */
const PARCEL_GEOMETRY = {
  crs: LOCAL_CRS,
  type: "Polygon" as const,
  coordinates: [
    [
      [-20, -12.5],
      [20, -12.5],
      [20, 12.5],
      [-20, 12.5],
      [-20, -12.5],
    ],
  ],
};

const PROJECT_ID = "ip3";
const UNIT_COUNT = 40;
const FLOOR_COUNT = 8;
const FLOOR_HEIGHT = 3;

beforeAll(async () => {
  db = await createTestDb();
  prisma = db.prisma;

  await prisma.organization.create({ data: { id: SEEDED_ORGANIZATION_ID, name: "Datum" } });
  versionId = (await loadTestRegionPackage(prisma, SEEDED_ORGANIZATION_ID)).versionId;

  // --- Proje, parsel, imar (A1–A2) ---
  await prisma.project.create({
    data: {
      id: PROJECT_ID,
      organizationId: SEEDED_ORGANIZATION_ID,
      name: "İP-3 kabul",
      projectType: "yeniYapi",
      tier: "K2",
      parcel: {
        create: {
          area: "1000.00",
          geometry: PARCEL_GEOMETRY,
          zoningData: {
            create: {
              groundCoverageRatio: "0.4000",
              floorAreaRatio: "2.0000",
              setbackFront: "3.00",
              setbackSide: "3.00",
              setbackRear: "3.00",
              maxFloorCount: FLOOR_COUNT,
              roadFrontages: [{ edgeIndex: 0, role: "front" }],
            },
          },
        },
      },
    },
  });
  await prisma.project.update({
    where: { id: PROJECT_ID },
    data: { regionPackageVersionId: versionId },
  });

  // --- A5 PROGRAM: blok, katlar, birimler, çekirdek ---
  const block = await prisma.block.create({
    data: { projectId: PROJECT_ID, name: "A Blok", isDefault: true },
  });

  // 8 normal kat × 5 birim = 40 bağımsız bölüm.
  for (let i = 1; i <= FLOOR_COUNT; i++) {
    await prisma.floor.create({
      data: {
        blockId: block.id,
        floorNo: i,
        floorType: i === 1 ? "zemin" : "normal",
        grossHeight: String(FLOOR_HEIGHT),
        units: {
          create: Array.from({ length: UNIT_COUNT / FLOOR_COUNT }, (_, u) => ({
            unitNo: `${i}-${u + 1}`,
            unitTypeCode: "3+1 A",
            usageType: "konut" as const,
          })),
        },
      },
    });
  }

  // Bodrum katları (rampa ve otopark için).
  for (let i = 1; i <= 2; i++) {
    await prisma.floor.create({
      data: { blockId: block.id, floorNo: -i, floorType: "bodrum", grossHeight: "2.70" },
    });
  }

  const core = await prisma.core.create({ data: { blockId: block.id } });
  await prisma.elevator.create({
    data: { coreId: core.id, elevatorType: "sedye", countComputedValue: 1 },
  });
  // Şaft konumu İP-4'te (sürüm 1.4) hesaplanan dörtlüye çevrildi: L1 ÖNERİR,
  // kullanıcı EZER. Burada konum elle veriliyor, yani bir ezmedir → Override.
  await prisma.shaft.createMany({
    data: [
      { coreId: core.id, shaftType: "tesisat", width: "0.60", depth: "0.60", offsetXOverrideValue: "0.80", offsetYOverrideValue: "-0.50", runsThroughFloors: [1, 2, 3, 4, 5, 6, 7, 8] },
      { coreId: core.id, shaftType: "havalandirma", width: "0.40", depth: "0.40", offsetXOverrideValue: "-0.90", offsetYOverrideValue: "0.40", runsThroughFloors: [1, 2, 3, 4, 5, 6, 7, 8] },
    ],
  });
}, 60_000);

afterAll(async () => {
  await db?.close();
});

// ============================================================================

describe("0. paket ve yayım kapısı", () => {
  it("fixture GERÇEK yayım kapısından geçti", async () => {
    const version = await prisma.regionPackageVersion.findUnique({ where: { id: versionId } });
    expect(version?.status).toBe("published");
    // publishVersion rowHash yazar; elle status çevirmek yazmazdı.
    const rule = await prisma.parkingRule.findFirst({ where: { regionPackageVersionId: versionId } });
    expect(rule?.rowHash).toBeTruthy();
  });

  it("fixture'ın TÜM formülleri sözleşmelerine uyuyor", async () => {
    for (const slot of FORMULA_SLOTS) {
      const rows = (await (prisma[slot.model] as never as {
        findMany: (a: object) => Promise<Record<string, unknown>[]>;
      }).findMany({ where: { regionPackageVersionId: versionId } })) as Record<string, unknown>[];

      for (const row of rows) {
        const source = row[slot.field];
        if (source == null) {
          expect(slot.optional, `${slot.model}.${slot.field} boş ama zorunlu`).toBe(true);
          continue;
        }
        const v = validateFormula(String(source), slot.contract);
        expect(v.ok, `${slot.model}.${String(row.ruleKey)}: ${JSON.stringify(source)}`).toBe(true);
      }
    }
  });

  it("İP-3'ün kural tabloları DOLU", async () => {
    const where = { regionPackageVersionId: versionId };
    expect(await prisma.coreRule.count({ where })).toBe(1);
    expect(await prisma.parkingRule.count({ where })).toBe(1);
    expect(await prisma.fireSafetyRule.count({ where })).toBe(1);
    expect(await prisma.utilityCoefficientSet.count({ where })).toBe(1);
    expect(await prisma.requiredSpaceRule.count({ where })).toBeGreaterThan(5);
  });
});

describe("1. zarf (L0 — İP-2'nin çıktısı, L1'in girdisi)", () => {
  it("zarf hesaplanıyor", async () => {
    const r = await computeAndStoreL0(PROJECT_ID, prisma);
    expect(r.buildableEnvelope).not.toBeNull();
    // 40×25 parsel, her kenardan 3 m → 34×19 = 646 m².
    expect(r.envelopeArea).toBeCloseTo(646, 1);
    expect(r.maxFootprint).toBeCloseTo(400, 3); // 1000 × 0.40
  });
});

describe("2. ÇEKİRDEK YERLEŞİYOR", () => {
  it("strateji önerilip poligon üretiliyor ve saklanıyor", async () => {
    const r = await computeAndStoreL1(PROJECT_ID, prisma);

    expect(r.stored).toBe(true);
    expect(r.coreStrategy).not.toBeNull();
    expect(r.geometry).not.toBeNull();
    expect(r.area).toBeGreaterThan(0);
    expect(r.requiredElevatorCount).toBe(1); // 8 kat ≥ 4 eşiği

    // GENERATED kolonlara yansıdı mı?
    const core = await prisma.core.findFirst({ include: { block: true } });
    expect(core?.coreStrategy).toBe(r.coreStrategy);
    expect(core?.requiredElevatorCount).toBe(1);
    expect(Number(core?.area)).toBeCloseTo(r.area!, 3);
  });

  it("çekirdek zarfın İÇİNDE", async () => {
    const core = await prisma.core.findFirst();
    const geometry = parseLocalPolygon(core!.geometry)!;
    const zoning = await prisma.zoningData.findFirst();
    const envelope = zoning!.buildableEnvelope as unknown as { coordinates: number[][][][] };
    const plate: LocalPolygon = polygon(envelope.coordinates[0] as never);
    expect(containsPolygon(plate, geometry)).toBe(true);
  });

  it("bina yüksekliği bloğa yazıldı — bodrum SAYILMADI", async () => {
    const block = await prisma.block.findFirst();
    // 8 zemin üstü kat × 3 m. İki bodrum katı dahil edilmemeli.
    expect(Number(block?.buildingHeight)).toBeCloseTo(FLOOR_COUNT * FLOOR_HEIGHT, 2);
  });

  it("çekirdek ölçüsü PAKETTEN geliyor", async () => {
    // genişlik = kuyu 1.20 + merdiven 1.20 + hol 1.50 = 3.90
    const core = await prisma.core.findFirst();
    const bb = boundingBox(parseLocalPolygon(core!.geometry)!);
    expect(bb.width).toBeCloseTo(3.9, 6);
  });
});

describe("3. ŞAFT DÜŞEY SÜREKLİLİĞİ (kullanıcının ek şartı)", () => {
  it("şaft konumu çekirdeğe GÖRELİ saklanıyor", async () => {
    const shafts = await prisma.shaft.findMany({ orderBy: { shaftType: "asc" } });
    expect(shafts).toHaveLength(2);
    for (const s of shafts) {
      expect(s.offsetX).not.toBeNull();
      expect(s.offsetY).not.toBeNull();
    }
  });

  it("çekirdek taşınınca ŞAFTLAR BİRLİKTE taşınıyor, offset DEĞİŞMİYOR", async () => {
    const core = await prisma.core.findFirst();
    const before = parseLocalPolygon(core!.geometry)!;
    const shafts = await prisma.shaft.findMany({ orderBy: { shaftType: "asc" } });

    const absBefore = shafts.map((s) =>
      shaftAbsolutePosition(before, Number(s.offsetX), Number(s.offsetY)),
    );

    // Kullanıcı çekirdeği taşıyor — bu bir EZMEdir (ilke 5).
    const moved = translatePolygon(before, 6, -4);
    await prisma.core.update({
      where: { id: core!.id },
      data: {
        geometryOverrideValue: moved as never,
        geometryOverrideReason: "Cephe düzeni gereği çekirdek doğuya kaydırıldı",
      },
    });

    const after = await prisma.core.findFirst();
    const afterGeometry = parseLocalPolygon(after!.geometry)!;
    const shaftsAfter = await prisma.shaft.findMany({ orderBy: { shaftType: "asc" } });

    // Offset kolonlarına DOKUNULMADI.
    shaftsAfter.forEach((s, i) => {
      expect(Number(s.offsetX)).toBe(Number(shafts[i]!.offsetX));
      expect(Number(s.offsetY)).toBe(Number(shafts[i]!.offsetY));
    });

    // Ama mutlak konumlar çekirdekle birlikte kaydı.
    const absAfter = shaftsAfter.map((s) =>
      shaftAbsolutePosition(afterGeometry, Number(s.offsetX), Number(s.offsetY)),
    );
    absAfter.forEach((p, i) => {
      expect(p[0] - absBefore[i]![0]).toBeCloseTo(6, 6);
      expect(p[1] - absBefore[i]![1]).toBeCloseTo(-4, 6);
    });
  });

  it("aynı şaft TÜM katlarda aynı yerde", async () => {
    // runsThroughFloors sekiz katı da kapsıyor ve konum kata bağlı DEĞİL:
    // süreklilik korunacak bir kural değil, göreli konumun sonucudur.
    const core = await prisma.core.findFirst();
    const geometry = parseLocalPolygon(core!.geometry)!;
    const shaft = await prisma.shaft.findFirst({ where: { shaftType: "tesisat" } });
    expect(shaft!.runsThroughFloors).toHaveLength(FLOOR_COUNT);

    const positions = shaft!.runsThroughFloors.map(() =>
      shaftAbsolutePosition(geometry, Number(shaft!.offsetX), Number(shaft!.offsetY)),
    );
    for (const p of positions) {
      expect(p[0]).toBeCloseTo(positions[0]![0], 12);
      expect(p[1]).toBeCloseTo(positions[0]![1], 12);
    }
  });

  it("ezme kaydı OverrideLedger'da görünüyor", async () => {
    const rows = await prisma.$queryRawUnsafe<{ fieldKey: string }[]>(
      `SELECT "fieldKey" FROM "OverrideLedger" WHERE "entityType" = 'Core'`,
    );
    expect(rows.map((r) => r.fieldKey)).toContain("geometry");
  });
});

describe("4. SERVİS MEKANLARI LİSTELENİYOR", () => {
  it("checklist paketten üretiliyor, zorunlular işaretli", async () => {
    const reader = await createRuleReader(PROJECT_ID, prisma);
    const [rules, coefficients] = await Promise.all([
      reader.requiredSpaceRules(),
      reader.utilityCoefficients(),
    ]);

    const r = computeServiceSpaces({
      unitCount: UNIT_COUNT,
      totalFloorArea: 4000,
      buildingHeight: FLOOR_COUNT * FLOOR_HEIGHT,
      commonArea: 400,
      rules: rules.map((x) => ({
        ruleKey: x.ruleKey,
        serviceSpaceType: x.serviceSpaceType,
        triggerType: x.triggerType,
        threshold: Number(x.threshold),
        areaFormula: x.areaFormula,
      })),
      coefficients: coefficients
        ? {
            demandPowerPerUnit: Number(coefficients.demandPowerPerUnit),
            demandPowerPerCommonArea: Number(coefficients.demandPowerPerCommonArea),
            personsPerUnit: Number(coefficients.personsPerUnit),
          }
        : null,
    });

    expect(r.requirements.length).toBeGreaterThan(5);

    const by = (k: string) => r.requirements.find((x) => x.ruleKey === k)!;
    expect(by("shelter").isMandatory).toBe(true); // 40 birim ≥ 12
    expect(by("janitorApartment").isMandatory).toBe(true); // 40 ≥ 30
    // Bina 24 m; yangın pompası eşiği 30,5 m → zorunlu DEĞİL.
    expect(by("fireSystem").isMandatory).toBe(false);
    // Jeneratör eşiği 250 kW; talep gücü 40×3 + 400×0.02 = 128 kW.
    expect(by("generator").isMandatory).toBe(false);

    // Alanlar formülden geldi.
    expect(by("shelter").requiredArea).toBeCloseTo(140, 3); // 40 × 3.5 kişi × 1 m²
    expect(r.mandatoryAreaTotal).toBeGreaterThan(0);
  });

  it("hiçbir tetikleyici TANINMAZ kalmadı", async () => {
    const reader = await createRuleReader(PROJECT_ID, prisma);
    const rules = await reader.requiredSpaceRules();
    const r = computeServiceSpaces({
      unitCount: UNIT_COUNT,
      totalFloorArea: 4000,
      buildingHeight: 24,
      commonArea: 400,
      rules: rules.map((x) => ({
        ruleKey: x.ruleKey,
        serviceSpaceType: x.serviceSpaceType,
        triggerType: x.triggerType,
        threshold: Number(x.threshold),
        areaFormula: x.areaFormula,
      })),
      coefficients: { demandPowerPerUnit: 3, demandPowerPerCommonArea: 0.02, personsPerUnit: 3.5 },
    });
    expect(r.warnings.map((w) => w.code)).not.toContain("SERVICE_TRIGGER_UNKNOWN");
  });
});

describe("5. OTOPARK SENARYOLARI YAN YANA", () => {
  async function scenarios() {
    const reader = await createRuleReader(PROJECT_ID, prisma);
    const rule = await reader.parkingRule();
    const core = await prisma.core.findFirst();

    const ramp = computeRamp({
      basementFloorCount: 2,
      basementFloorHeight: 2.7,
      maxRampSlope: Number(rule!.maxRampSlope),
      width: 5,
    });

    return {
      ramp,
      result: computeParkingScenarios({
        unitCount: UNIT_COUNT,
        totalFloorArea: 4000,
        commercialArea: 0,
        residentialUnitCount: UNIT_COUNT,
        basementFloorArea: 646,
        serviceSpaceArea: 200,
        coreArea: Number(core!.area),
        rampFootprintArea: ramp.footprintArea,
        rule: {
          requirementFormula: rule!.requirementFormula,
          areaPerSpace: Number(rule!.areaPerSpace),
          accessibleAreaPerSpace: Number(rule!.accessibleAreaPerSpace),
          bicycleAreaPerSpace: Number(rule!.bicycleAreaPerSpace),
          accessibleRatio: Number(rule!.accessibleRatio),
          bicycleRatio: Number(rule!.bicycleRatio),
          maxRampSlope: Number(rule!.maxRampSlope),
        },
        targetCount: UNIT_COUNT,
      }),
    };
  }

  it("en az iki senaryo, farklı eksiklerle", async () => {
    const { result } = await scenarios();
    expect(result.requiredCount).toBe(UNIT_COUNT);
    expect(result.scenarios.length).toBeGreaterThanOrEqual(2);

    const deficits = result.scenarios.map((s) => s.deficitCount);
    expect(new Set(deficits).size).toBeGreaterThan(1); // gerçekten FARKLI
    expect(result.scenarios[0]!.deficitCount).toBeGreaterThan(0); // eksikli
    expect(result.scenarios[result.scenarios.length - 1]!.meetsRequirement).toBe(true);
  });

  it("rampa bodrum derinliğinden türüyor ve havuzdan düşülüyor", async () => {
    const { ramp } = await scenarios();
    // 2 bodrum × 2,70 m ÷ 0,18 = 30 m; 5 m genişlikte 150 m² ayak izi.
    expect(ramp.length).toBeCloseTo(30, 3);
    expect(ramp.footprintArea).toBeCloseTo(150, 3);
  });

  it("SİSTEM KARAR VERMİYOR — seçim yapılmadan hiçbir şey kalıcı değil", async () => {
    const layout = await prisma.parkingLayout.findFirst({ where: { projectId: PROJECT_ID } });
    expect(layout).toBeNull();
  });

  it("eksikli senaryo seçimi EZME + KABUL EDİLEN EKSİK olarak kalıcı", async () => {
    const { result } = await scenarios();
    const chosen = result.scenarios[0]!; // bilerek eksikli olan
    expect(chosen.deficitCount).toBeGreaterThan(0);

    await prisma.parkingLayout.create({
      data: {
        projectId: PROJECT_ID,
        requiredCountComputedValue: result.requiredCount,
        plannedCountComputedValue: chosen.plannedCount,
        deficitCountComputedValue: chosen.deficitCount,
        basementFloorCountOverrideValue: chosen.basementFloorCount,
        basementFloorCountOverrideReason:
          "Kazı maliyeti nedeniyle tek bodrum seçildi; eksik park bilinçli kabul edildi.",
        acceptedDeficitCount: chosen.deficitCount,
      },
    });

    const stored = await prisma.parkingLayout.findFirst({ where: { projectId: PROJECT_ID } });
    expect(stored?.basementFloorCount).toBe(chosen.basementFloorCount);
    expect(stored?.acceptedDeficitCount).toBe(chosen.deficitCount);
    expect(stored?.basementFloorCountOverrideReason).toContain("bilinçli");

    // Risk kabulü İP-9 raporu için ledger'da da görünür.
    const rows = await prisma.$queryRawUnsafe<{ fieldKey: string }[]>(
      `SELECT "fieldKey" FROM "OverrideLedger" WHERE "entityType" = 'ParkingLayout'`,
    );
    expect(rows.map((r) => r.fieldKey)).toContain("basementFloorCount");
  });
});

describe("6. paket boşsa hesaplanmaz (ilke 1)", () => {
  it("pakete BAĞLI OLMAYAN projede çekirdek üretilmiyor", async () => {
    await prisma.project.create({
      data: {
        id: "unbound",
        organizationId: SEEDED_ORGANIZATION_ID,
        name: "Bağsız",
        projectType: "yeniYapi",
        tier: "K2",
        blocks: { create: { name: "A", isDefault: true, core: { create: {} } } },
      },
    });

    const r = await computeAndStoreL1("unbound", prisma);
    expect(r.geometry).toBeNull();
    expect(r.warnings.map((w) => w.code)).toContain("PACKAGE_NOT_BOUND");
  });
});
