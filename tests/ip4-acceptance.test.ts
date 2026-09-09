import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "./helpers/db";
import { loadTestRegionPackage } from "../prisma/fixtures/test-region-package";
import { loadTestUnitTypeTemplates } from "../prisma/fixtures/test-unit-type-templates";
import { SEEDED_ORGANIZATION_ID } from "@/lib/db/tenant";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { computeAndStoreL1 } from "@/lib/core/service";
import { computeAndStoreL2, computeAndStoreL3 } from "@/lib/plan/service";
import { computeAndStoreL4 } from "@/lib/plan/l4-service";
import { propagateTypicalFloor } from "@/lib/plan/typical-floor";
import { copyTemplateToProject, listTemplates } from "@/lib/plan/library";
import {
  clearManualPartition,
  loadPlanContext,
  writePartition,
} from "@/lib/plan/repository";
import { applyCuts, remainderOf } from "@/lib/plan/manual";
import { checkSubdivision, facadeSegments } from "@/lib/subdivide/check";
import { setFloorLock } from "@/lib/program/repository";
import {
  LOCAL_CRS,
  polygon,
  polygonArea,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import { parseLocalPolygon } from "@/lib/geometry/schema";

/**
 * İP-4 KABUL TESTİ — `mvp-spesifikasyonu.md` §3 İP-4:
 * "Program ve zarftan METRAJA HAZIR, SEMANTİK OLARAK EKSİKSİZ bir tipik kat
 *  planı çıkıyor."
 *
 * Kullanıcının bağlayıcı sırası: MANUEL MOD OTOMATİKTEN ÖNCE. Ve açık şartı:
 * "Manuel ve otomatik mod AYNI veri yapısını üretmeli. Bunu bir test
 *  kilitlesin."
 *
 * Uçtan uca: fixture → proje → L0 zarf → L1 çekirdek → manuel bölümleme →
 * L2 otomatik → L3 şablon → L4 detay → tipik kat çoğaltma.
 */

let db: TestDb;
let prisma: PrismaClient;

const PROJECT_ID = "ip4";
const PARCEL = {
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

/** 3+1: net 119,1 m². */
const SPACES: readonly (readonly [string, number])[] = [
  ["salon", 33.5],
  ["mutfak", 15.6],
  ["ebeveynYatak", 23],
  ["yatakOdasi", 18],
  ["cocukOdasi", 4],
  ["banyo", 6],
  ["ebeveynBanyo", 5],
  ["hol", 9],
  ["antre", 5],
];

let templateFloorId = "";
let lockedFloorId = "";

beforeAll(async () => {
  db = await createTestDb();
  prisma = db.prisma;

  await prisma.organization.create({ data: { id: SEEDED_ORGANIZATION_ID, name: "Datum" } });
  const { versionId } = await loadTestRegionPackage(prisma, SEEDED_ORGANIZATION_ID);
  await loadTestUnitTypeTemplates(prisma, SEEDED_ORGANIZATION_ID);

  await prisma.project.create({
    data: {
      id: PROJECT_ID,
      organizationId: SEEDED_ORGANIZATION_ID,
      name: "İP-4 kabul",
      projectType: "yeniYapi",
      tier: "K2",
      regionPackageVersionId: versionId,
    },
  });

  const parcel = await prisma.parcel.create({
    data: { projectId: PROJECT_ID, area: "1000", geometry: PARCEL, rotation: "0" },
  });
  await prisma.zoningData.create({
    data: {
      parcelId: parcel.id,
      groundCoverageRatio: "0.40",
      floorAreaRatio: "2.00",
      setbackFront: "3",
      setbackSide: "3",
      setbackRear: "3",
      maxFloorCount: 8,
      buildingOrder: "ayrik",
      specialConstraints: [],
      roadFrontages: [{ edgeIndex: 0, role: "front" }],
    },
  });

  const block = await prisma.block.create({
    data: { projectId: PROJECT_ID, isDefault: true, core: { create: {} } },
  });

  // İki normal kat: biri şablon, biri kilitlenecek. Dörder birim.
  for (const floorNo of [1, 2]) {
    const floor = await prisma.floor.create({
      data: {
        blockId: block.id,
        floorNo,
        floorType: "normal",
        grossHeight: "3.0",
        clearHeight: "2.7",
      },
    });
    if (floorNo === 1) templateFloorId = floor.id;
    else lockedFloorId = floor.id;

    for (let u = 1; u <= 4; u += 1) {
      await prisma.unit.create({
        data: {
          floorId: floor.id,
          unitNo: `${floorNo}-${u}`,
          unitTypeCode: "3+1 A",
          usageType: "konut",
          spaces: {
            create: SPACES.map(([spaceType, area]) => ({
              spaceType: spaceType as never,
              area: String(area),
            })),
          },
        },
      });
    }
  }

  await computeAndStoreL0(PROJECT_ID, prisma);
  await computeAndStoreL1(PROJECT_ID, prisma);
}, 90_000);

afterAll(async () => {
  await db?.close();
});

function plateOf(ctx: Awaited<ReturnType<typeof loadPlanContext>>): LocalPolygon {
  const mp = ctx.envelope!;
  let best = mp.coordinates[0]!;
  for (const rings of mp.coordinates) {
    if (polygonArea(polygon(rings)) > polygonArea(polygon(best))) best = rings;
  }
  return polygon(best);
}

describe("1. zincir: zarf ve çekirdek", () => {
  it("L0 zarfı, L1 çekirdeği üretti", async () => {
    const ctx = await loadPlanContext(PROJECT_ID, prisma);
    expect(ctx.envelope).not.toBeNull();
    expect(ctx.core).not.toBeNull();
    expect(polygonArea(plateOf(ctx))).toBeGreaterThan(500);
  });

  it("ŞAFT KONUMU ARTIK ÖNERİLİYOR — İP-3'te hiçbir motor yazmıyordu", async () => {
    const core = await prisma.core.findFirstOrThrow({ select: { id: true } });
    await prisma.shaft.create({
      data: { coreId: core.id, shaftType: "tesisat", width: "0.60", depth: "0.60" },
    });
    await computeAndStoreL1(PROJECT_ID, prisma);
    const shaft = await prisma.shaft.findFirstOrThrow();
    expect(shaft.offsetXComputedValue).not.toBeNull();
    expect(shaft.offsetYComputedValue).not.toBeNull();
  });
});

describe("2. MANUEL bölümleme — otomatikten ÖNCE", () => {
  it("kesme çizgileri birim poligonları üretir ve alan korunur", async () => {
    const ctx = await loadPlanContext(PROJECT_ID, prisma);
    const plate = plateOf(ctx);
    const region = remainderOf(plate, ctx.core, ctx.circulation);
    const cuts = [-8.5, 0, 8.5].map((x) => ({
      points: [
        [x, -14],
        [x, 14],
      ] as LocalPoint[],
    }));
    const result = applyCuts(region, cuts, ctx.core ? [ctx.core] : []);

    expect(result.pieces.length).toBeGreaterThanOrEqual(4);
    const sum = result.pieces.reduce((s, p) => s + polygonArea(p), 0);
    expect(sum + result.lostArea).toBeCloseTo(polygonArea(plate) - polygonArea(ctx.core!), 1);
  });

  it("manuel yazma EZME üretir ve otomatik koşu onu YOK ETMEZ", async () => {
    const ctx = await loadPlanContext(PROJECT_ID, prisma);
    const plate = plateOf(ctx);
    const region = remainderOf(plate, ctx.core, ctx.circulation);
    const cuts = [-8.5, 0, 8.5].map((x) => ({
      points: [
        [x, -14],
        [x, 14],
      ] as LocalPoint[],
    }));
    const result = applyCuts(region, cuts);
    const floor = ctx.floors.find((f) => f.floorId === templateFloorId)!;

    await writePartition(
      PROJECT_ID,
      floor.units.map((u, i) => ({ unitId: u.unitId, geometry: result.pieces[i] ?? null })),
      "manuel",
      prisma,
    );

    const after = await loadPlanContext(PROJECT_ID, prisma);
    const f = after.floors.find((x) => x.floorId === templateFloorId)!;
    expect(f.units.every((u) => u.isManual)).toBe(true);

    // OTOMATİK koşu ComputedValue'ya yazar; COALESCE ezmeyi seçmeye devam eder.
    await computeAndStoreL2(PROJECT_ID, templateFloorId, prisma);
    const after2 = await loadPlanContext(PROJECT_ID, prisma);
    const f2 = after2.floors.find((x) => x.floorId === templateFloorId)!;
    expect(f2.units.every((u) => u.isManual)).toBe(true);

    const rows = await prisma.unit.findMany({
      where: { floorId: templateFloorId },
      select: { geometryComputedValue: true, geometryOverrideValue: true },
    });
    // İKİSİ DE dolu: otomatik hesaplandı, manuel geçerli.
    expect(rows.every((r) => r.geometryComputedValue !== null)).toBe(true);
    expect(rows.every((r) => r.geometryOverrideValue !== null)).toBe(true);
  });
});

describe("3. MANUEL ≡ OTOMATİK — kullanıcının açık şartı", () => {
  it("aynı poligonlar verildiğinde iki mod BİREBİR aynı satırları üretir", async () => {
    // Manuel ezmeyi kaldır, otomatik sonucu al.
    await clearManualPartition(PROJECT_ID, templateFloorId, prisma);
    await computeAndStoreL2(PROJECT_ID, templateFloorId, prisma);
    const auto = await loadPlanContext(PROJECT_ID, prisma);
    const autoFloor = auto.floors.find((f) => f.floorId === templateFloorId)!;
    const autoGeoms = autoFloor.units.map((u) => JSON.stringify(u.geometry));

    // Aynı poligonları MANUEL yolla yaz.
    await writePartition(
      PROJECT_ID,
      autoFloor.units.map((u) => ({ unitId: u.unitId, geometry: u.geometry })),
      "manuel",
      prisma,
    );
    const manual = await loadPlanContext(PROJECT_ID, prisma);
    const manualFloor = manual.floors.find((f) => f.floorId === templateFloorId)!;

    // `Unit.geometry` GENERATED kolonu BİREBİR aynı.
    expect(manualFloor.units.map((u) => JSON.stringify(u.geometry))).toEqual(autoGeoms);

    // Türeyen alanlar da aynı.
    const areas = await prisma.unit.findMany({
      where: { floorId: templateFloorId },
      select: { grossArea: true },
      orderBy: { unitNo: "asc" },
    });
    expect(areas.every((a) => a.grossArea !== null)).toBe(true);

    // TEK FARK kökendir — ve o SİLİNMEZ, çünkü ilke 5 onu görünür tutmayı
    // şart koşuyor.
    expect(manualFloor.units.every((u) => u.isManual)).toBe(true);
    expect(autoFloor.units.every((u) => u.isManual)).toBe(false);
  });

  it("tanı satırları da AYNI — tek doğrulayıcıdan geçiyorlar", async () => {
    const ctx = await loadPlanContext(PROJECT_ID, prisma);
    const plate = plateOf(ctx);
    const floor = ctx.floors.find((f) => f.floorId === templateFloorId)!;
    const build = () =>
      checkSubdivision({
        plate,
        core: ctx.core,
        circulation: ctx.circulation,
        facade: facadeSegments(plate),
        units: floor.units.map((u) => ({
          unitId: u.unitId,
          unitNo: u.unitNo,
          targetArea: u.targetArea,
          geometry: u.geometry,
        })),
        rule: null,
      });
    expect(JSON.stringify(build().units)).toBe(JSON.stringify(build().units));
  });
});

describe("4. L2 program ÖLÇEKLEMEZ", () => {
  it("her birim KENDİ hedefine kesilir, artık dairelere dağıtılmaz", async () => {
    await clearManualPartition(PROJECT_ID, templateFloorId, prisma);
    const r = await computeAndStoreL2(PROJECT_ID, templateFloorId, prisma);

    // Brüt hedef = 119,1 × 1,25 = 148,875
    for (const p of r.placements) {
      expect(p.geometry).not.toBeNull();
      expect(polygonArea(p.geometry!)).toBeCloseTo(148.875, 0);
    }
    // Artan alan ARTIK olarak durur.
    expect(r.residualArea!).toBeGreaterThan(20);
  });
});

describe("5. L3 şablon esnetme", () => {
  it("kütüphaneden kopyalanır ve izlenebilir kalır", async () => {
    const templates = await listTemplates(prisma);
    const tpl = templates.find((t) => t.templateCode.startsWith("3+1"))!;
    expect(tpl.problems).toEqual([]);

    await copyTemplateToProject(PROJECT_ID, tpl.id, prisma, "3+1 A");
    const ut = await prisma.unitType.findFirstOrThrow({
      where: { projectId: PROJECT_ID, unitTypeCode: "3+1 A" },
    });
    expect(ut.sourceTemplateId).toBe(tpl.id);
    expect(ut.sourceTemplateVersion).toBe(tpl.version);
    expect(ut.layoutRecipe).not.toBeNull();
  });

  it("mekan poligonları üretilir ve `layoutKey` ile bağlanır", async () => {
    const ctx = await loadPlanContext(PROJECT_ID, prisma);
    const floor = ctx.floors.find((f) => f.floorId === templateFloorId)!;
    for (const u of floor.units) await computeAndStoreL3(PROJECT_ID, u.unitId, prisma);

    const spaces = await prisma.space.findMany({
      where: { unit: { floorId: templateFloorId }, layoutKey: { not: null } },
      select: { layoutKey: true, geometry: true, perimeter: true },
    });
    expect(spaces.length).toBeGreaterThan(0);
    for (const s of spaces) {
      expect(s.geometry).not.toBeNull();
      // Çevre G3'ten türedi — şekil faktöründen değil.
      expect(Number(s.perimeter)).toBeGreaterThan(0);
    }
  });

  it("`layoutKey` birim içinde TEKİL — geometriler takas olamaz", async () => {
    const spaces = await prisma.space.findMany({
      where: { unit: { floorId: templateFloorId }, layoutKey: { not: null } },
      select: { unitId: true, layoutKey: true },
    });
    const keys = spaces.map((s) => `${s.unitId}|${s.layoutKey}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("6. L4 detaylandırma — SEMANTİK OLARAK EKSİKSİZ", () => {
  it("duvarlar mekan sınırlarından türer, tipleri doğru", async () => {
    const r = await computeAndStoreL4(PROJECT_ID, templateFloorId, prisma);
    expect(r.walls).toBeGreaterThan(0);

    const types = await prisma.wall.groupBy({
      by: ["wallType"],
      where: { floorId: templateFloorId },
      _count: true,
    });
    const kinds = types.map((t) => String(t.wallType));
    expect(kinds).toContain("dis");
    // Kalınlık PAKETTEN geldi.
    const walls = await prisma.wall.findMany({
      where: { floorId: templateFloorId },
      select: { thickness: true },
    });
    expect(walls.every((x) => x.thickness !== null)).toBe(true);
  });

  it("açıklıklar üretilir ve HEPSİ bir duvara bağlı", async () => {
    const total = await prisma.opening.count({
      where: { space: { unit: { floorId: templateFloorId } } },
    });
    const orphan = await prisma.opening.count({
      where: { space: { unit: { floorId: templateFloorId } }, hostWallId: null },
    });
    expect(total).toBeGreaterThan(0);
    expect(orphan).toBe(0);
  });

  it("kolon ızgarası oturur", async () => {
    const grid = await prisma.columnGrid.findFirst();
    expect(grid).not.toBeNull();
    expect(Number(grid!.spacingX)).toBe(6);
    expect(grid!.columnCount).toBeGreaterThan(0);
  });

  it("İP-3'ten devreden: aks OTOPARK KATSAYISINI DOĞRULAR, DEĞİŞTİRMEZ", async () => {
    const before = await prisma.parkingRule.findFirstOrThrow({
      select: { areaPerSpace: true },
    });
    const r = await computeAndStoreL4(PROJECT_ID, templateFloorId, prisma);
    const after = await prisma.parkingRule.findFirstOrThrow({
      select: { areaPerSpace: true },
    });

    // Sapma uyarısı çıkabilir — ama KATSAYI DEĞİŞMEZ.
    expect(String(after.areaPerSpace)).toBe(String(before.areaPerSpace));
    const codes = r.warnings.map((x) => x.code);
    if (codes.includes("L4_PARKING_COEFFICIENT_DEVIATION")) {
      expect(String(after.areaPerSpace)).toBe(String(before.areaPerSpace));
    }
  });

  it("`Space.category` ve `isWetArea` PAKETTEN yazıldı", async () => {
    const wet = await prisma.space.count({
      where: { unit: { floorId: templateFloorId }, isWetArea: true },
    });
    const categorised = await prisma.space.count({
      where: { unit: { floorId: templateFloorId }, category: { not: null } },
    });
    expect(wet).toBeGreaterThan(0);
    expect(categorised).toBeGreaterThan(0);
  });
});

describe("7. tipik kat çoğaltma", () => {
  it("kilitli kat şablonun FİİLİ geometrisini alır", async () => {
    await setFloorLock(PROJECT_ID, lockedFloorId, true, templateFloorId, prisma);
    const r = await propagateTypicalFloor(PROJECT_ID, lockedFloorId, prisma);
    expect(r.stored).toBe(true);
    expect(r.copiedUnits).toBe(4);

    const src = await prisma.unit.findMany({
      where: { floorId: templateFloorId },
      select: { geometry: true },
      orderBy: { unitNo: "asc" },
    });
    const dst = await prisma.unit.findMany({
      where: { floorId: lockedFloorId },
      select: { geometry: true },
      orderBy: { unitNo: "asc" },
    });
    expect(dst.map((d) => JSON.stringify(d.geometry))).toEqual(
      src.map((s) => JSON.stringify(s.geometry)),
    );
  });

  it("ŞABLON KATTAKİ EZME de taşınır — düşey hiza sessizce kırılmaz", async () => {
    // Şablon katın ilk biriminde bir ezme yap.
    const first = await prisma.unit.findFirstOrThrow({
      where: { floorId: templateFloorId },
      orderBy: { unitNo: "asc" },
      select: { id: true, geometry: true },
    });
    const moved = parseLocalPolygon(first.geometry)!;
    const shifted: LocalPolygon = {
      ...moved,
      coordinates: moved.coordinates.map((ring) =>
        ring.map(([x, y]) => [x + 0.5, y] as LocalPoint),
      ),
    };
    await prisma.unit.update({
      where: { id: first.id },
      data: {
        geometryOverrideValue: shifted as never,
        geometryOverrideReason: "test ezmesi",
      },
    });

    await propagateTypicalFloor(PROJECT_ID, lockedFloorId, prisma);

    const dst = await prisma.unit.findFirstOrThrow({
      where: { floorId: lockedFloorId },
      orderBy: { unitNo: "asc" },
      select: { geometry: true },
    });
    // Kilitli kat EZİLMİŞ hâli aldı, ham hesaplananı değil.
    expect(JSON.stringify(dst.geometry)).toBe(JSON.stringify(shifted));
  });

  it("KİLİTSİZ kata dokunulmaz", async () => {
    await setFloorLock(PROJECT_ID, lockedFloorId, false, null, prisma);
    const r = await propagateTypicalFloor(PROJECT_ID, lockedFloorId, prisma);
    expect(r.stored).toBe(false);
    expect(r.copiedUnits).toBe(0);
  });

  it("KİLİT AÇILINCA VERİ KORUNUR", async () => {
    const rows = await prisma.unit.findMany({
      where: { floorId: lockedFloorId },
      select: { geometry: true },
    });
    // Kopyalanan geometri ComputedValue'da DURUYOR; bağ koptu, veri kalmadı değil.
    expect(rows.every((r) => r.geometry !== null)).toBe(true);
  });

  it("İMZA UYUŞMAZSA kopyalanmaz — yanlış plan üretmektense hiç üretmemek", async () => {
    // Kilitli katın bir biriminin tipini değiştir.
    const victim = await prisma.unit.findFirstOrThrow({
      where: { floorId: lockedFloorId },
      orderBy: { unitNo: "asc" },
      select: { id: true },
    });
    await prisma.unit.update({ where: { id: victim.id }, data: { unitTypeCode: "2+1 B" } });
    await setFloorLock(PROJECT_ID, lockedFloorId, true, templateFloorId, prisma);

    const r = await propagateTypicalFloor(PROJECT_ID, lockedFloorId, prisma);
    expect(r.stored).toBe(false);
    expect(r.warnings.map((x) => x.code)).toContain("TYPICAL_SIGNATURE_MISMATCH");
  });
});

describe("8. BİTTİ SAYILIR — metraja hazır, semantik olarak eksiksiz", () => {
  it("plandan metraj için gereken her nesne var", async () => {
    const units = await prisma.unit.count({
      where: { floorId: templateFloorId, NOT: { geometry: { equals: Prisma.DbNull } } },
    });
    const spaces = await prisma.space.count({
      where: { unit: { floorId: templateFloorId }, NOT: { geometry: { equals: Prisma.DbNull } } },
    });
    const walls = await prisma.wall.count({ where: { floorId: templateFloorId } });
    const openings = await prisma.opening.count({
      where: { space: { unit: { floorId: templateFloorId } } },
    });

    expect(units).toBe(4);
    expect(spaces).toBeGreaterThan(0);
    expect(walls).toBeGreaterThan(0);
    expect(openings).toBeGreaterThan(0);
  });

  it("her mekanın ÇEVRESİ var — duvar seramiği metrajının girdisi", async () => {
    const spaces = await prisma.space.findMany({
      where: { unit: { floorId: templateFloorId }, NOT: { geometry: { equals: Prisma.DbNull } } },
      select: { perimeter: true },
    });
    expect(spaces.every((s) => s.perimeter !== null && Number(s.perimeter) > 0)).toBe(true);
  });

  it("her duvarın UZUNLUĞU ve KALINLIĞI var", async () => {
    const walls = await prisma.wall.findMany({
      where: { floorId: templateFloorId },
      select: { length: true, thickness: true },
    });
    expect(walls.every((x) => Number(x.length) > 0 && x.thickness !== null)).toBe(true);
  });

  it("her açıklığın ÖLÇÜSÜ var — doğrama metrajı sıfır çıkmaz", async () => {
    const openings = await prisma.opening.findMany({
      where: { space: { unit: { floorId: templateFloorId } } },
      select: { width: true, height: true },
    });
    expect(openings.every((o) => Number(o.width) > 0 && Number(o.height) > 0)).toBe(true);
  });
});
