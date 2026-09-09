import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, type TestDb } from "./helpers/db";
import { loadTestRegionPackage, FIXTURE_ADMIN_UNIT } from "../prisma/fixtures/test-region-package";
import { SEEDED_ORGANIZATION_ID } from "@/lib/db/tenant";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { createRuleReader } from "@/lib/rules/reader";
import {
  addStakeholder,
  computeMajority,
  saveParcel,
  saveZoningData,
} from "@/lib/parcel/repository";
import { LOCAL_CRS, partCount } from "@/lib/geometry";
import type { WarningCode } from "@/lib/warnings";

/**
 * İP-2 KABUL TESTİ — `mvp-spesifikasyonu.md`:58
 * "Parsel ve imar verisi girilince zarf ve azami inşaat alanı doğru çıkıyor."
 *
 * Uçtan uca: sentetik paket → yayım → projeye bağlama → kural okuma →
 * L0 hesabı → GENERATED kolonlara yazım.
 */

let db: TestDb;
let prisma: PrismaClient;
let versionId: string;

/** L şeklinde parsel, 516 m². */
const L_PARCEL_GEOMETRY = {
  crs: LOCAL_CRS,
  type: "Polygon" as const,
  coordinates: [
    [
      [-15, -12.5],
      [15, -12.5],
      [15, -0.5],
      [-3, -0.5],
      [-3, 12.5],
      [-15, 12.5],
      [-15, -12.5],
    ],
  ],
};

async function createProjectWithZoning(
  opts: {
    id: string;
    bind?: boolean;
    withGeometry?: boolean;
    groundCoverageRatio?: string;
  } = { id: "p" },
) {
  const project = await prisma.project.create({
    data: {
      id: opts.id,
      organizationId: SEEDED_ORGANIZATION_ID,
      name: `Test ${opts.id}`,
      projectType: "yeniYapi",
      tier: "K2",
      parcel: {
        create: {
          area: "516.00",
          ...(opts.withGeometry ? { geometry: L_PARCEL_GEOMETRY } : {}),
          zoningData: {
            create: {
              groundCoverageRatio: opts.groundCoverageRatio ?? "0.5000",
              floorAreaRatio: "1.5000",
              setbackFront: "3.00",
              setbackSide: "3.00",
              setbackRear: "3.00",
              maxFloorCount: 4,
              roadFrontages: [{ edgeIndex: 0, role: "front" }],
            },
          },
        },
      },
    },
  });

  if (opts.bind !== false) {
    await prisma.project.update({
      where: { id: project.id },
      data: { regionPackageVersionId: versionId },
    });
  }
  return project;
}

beforeAll(async () => {
  db = await createTestDb();
  prisma = db.prisma;

  await prisma.organization.create({
    data: { id: SEEDED_ORGANIZATION_ID, name: "Datum" },
  });

  const fixture = await loadTestRegionPackage(prisma, SEEDED_ORGANIZATION_ID);
  versionId = fixture.versionId;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

const codes = (r: { warnings: readonly { code: WarningCode }[] }) =>
  r.warnings.map((x) => x.code);

describe("sentetik test paketi", () => {
  it("yayımlanmış ve TEST FIXTURE olarak işaretli", async () => {
    const version = await prisma.regionPackageVersion.findUnique({
      where: { id: versionId },
      include: { regionPackage: true },
    });
    expect(version?.status).toBe("published");
    expect(version?.regionPackage.adminUnit).toBe(FIXTURE_ADMIN_UNIT);
  });

  it("İP-2'nin ihtiyacı dolu", async () => {
    const where = { regionPackageVersionId: versionId };
    expect(await prisma.zoningRuleSet.count({ where })).toBe(1);
    expect(await prisma.specialConstraintCatalog.count({ where })).toBe(11);
    expect(await prisma.heightReferenceCatalog.count({ where })).toBe(4);
    expect(await prisma.stakeholderConsentRule.count({ where })).toBe(1);
  });

  it("İP-5 ve sonrasının tabloları HÂLÂ boş", async () => {
    // İP-3 ve İP-4 kendi tablolarını doldurdu; sonraki paketlerinki bilinçli
    // boş. Doldurmak, olmayan bir mevzuatı varmış gibi göstermek olurdu.
    const where = { regionPackageVersionId: versionId };
    expect(await prisma.costItemCatalog.count({ where })).toBe(0);
    expect(await prisma.objectCostMapping.count({ where })).toBe(0);
    expect(await prisma.structuralCoefficientSet.count({ where })).toBe(0);
    expect(await prisma.processTemplate.count({ where })).toBe(0);
    expect(await prisma.incentiveProgram.count({ where })).toBe(0);
    expect(await prisma.facadeMaterialCatalog.count({ where })).toBe(0);
  });

  it("yayımdan sonra DEĞİŞTİRİLEMİYOR — yeniden seed gerekir", async () => {
    await expect(
      prisma.zoningRuleSet.updateMany({
        where: { regionPackageVersionId: versionId },
        data: { offsetJoinType: "round" },
      }),
    ).rejects.toThrow(/DATUM_FROZEN/);
  });
});

describe("kural okuyucu", () => {
  it("dondurulmuş sürümden kural okuyor", async () => {
    await createProjectWithZoning({ id: "pRules" });
    const reader = await createRuleReader("pRules", prisma);

    expect(reader.versionId).toBe(versionId);
    const ruleSet = await reader.zoningRuleSet();
    expect(ruleSet?.offsetJoinType).toBe("miter");
    expect(ruleSet?.farCalculationBasis).toBe("brut");

    const constraints = await reader.specialConstraints();
    expect(constraints).toHaveLength(11);
    expect(constraints.find((c) => c.ruleKey === "maniaKotu")).toMatchObject({
      effectTarget: "maxHeight",
      effectKind: "cap",
    });
  });

  it("pakete bağlı olmayan proje uyarı üretiyor, PATLAMIYOR", async () => {
    await createProjectWithZoning({ id: "pUnbound", bind: false });
    const reader = await createRuleReader("pUnbound", prisma);

    expect(reader.versionId).toBeNull();
    expect(await reader.zoningRuleSet()).toBeNull();
    expect(reader.warnings.map((w) => w.code)).toContain("PACKAGE_NOT_BOUND");
  });
});

describe("L0 — bitti sayılır ölçütü", () => {
  it("K2: zarf ve azami inşaat alanı çıkıyor, GENERATED kolonlara yazılıyor", async () => {
    await createProjectWithZoning({ id: "pL0", withGeometry: true });
    const result = await computeAndStoreL0("pL0", prisma);

    expect(result.stored).toBe(true);
    expect(result.maxFootprint).toBeCloseTo(258, 4);
    expect(result.maxTotalFloorArea).toBeCloseTo(774, 4);
    expect(result.envelopeArea).toBeCloseTo(222.0, 1);
    expect(result.floorCount).toBe(4);

    // Veritabanındaki GENERATED kolonlar dolmuş olmalı
    const zoning = await prisma.zoningData.findFirst({
      where: { parcel: { projectId: "pL0" } },
    });
    expect(Number(zoning?.maxFootprint)).toBeCloseTo(258, 3);
    expect(Number(zoning?.maxTotalFloorArea)).toBeCloseTo(774, 3);
    expect(zoning?.buildableEnvelope).not.toBeNull();
    // Bodrum kazanımı İP-2'de hesaplanmaz
    expect(zoning?.basementGainFromLevelDifference).toBeNull();
  });

  it("K1: poligon yokken skaler hesap yine yapılıyor", async () => {
    await createProjectWithZoning({ id: "pK1", withGeometry: false });
    const result = await computeAndStoreL0("pK1", prisma);

    expect(result.maxFootprint).toBeCloseTo(258, 4);
    expect(result.maxTotalFloorArea).toBeCloseTo(774, 4);
    expect(result.buildableEnvelope).toBeNull();
    expect(codes(result)).toContain("PARCEL_GEOMETRY_MISSING");
  });

  it("taban alanı aşımında uyarır ama KIRPMAZ", async () => {
    await createProjectWithZoning({
      id: "pOver",
      withGeometry: true,
      groundCoverageRatio: "0.4000",
    });
    const result = await computeAndStoreL0("pOver", prisma);

    expect(result.maxFootprint).toBeCloseTo(206.4, 3);
    expect(result.envelopeArea!).toBeGreaterThan(result.maxFootprint!);
    expect(codes(result)).toContain("ENVELOPE_EXCEEDS_FOOTPRINT");

    // Zarf kırpılmadı: hâlâ tam parça
    expect(partCount(result.buildableEnvelope!)).toBe(1);
  });

  it("kullanıcının ezmesi hesaplanan değeri geçiyor (ilke 5)", async () => {
    await createProjectWithZoning({ id: "pOverride", withGeometry: true });
    await computeAndStoreL0("pOverride", prisma);

    const zoning = await prisma.zoningData.findFirst({
      where: { parcel: { projectId: "pOverride" } },
    });
    expect(Number(zoning?.maxFootprint)).toBeCloseTo(258, 3);

    await prisma.zoningData.update({
      where: { id: zoning!.id },
      data: {
        maxFootprintOverrideValue: "240.000",
        maxFootprintOverrideReason: "Belediye görüşü",
      },
    });

    const after = await prisma.zoningData.findUnique({ where: { id: zoning!.id } });
    expect(Number(after?.maxFootprint)).toBeCloseTo(240, 3);

    // Ezme raporda görünmeli
    const ledger = await prisma.$queryRawUnsafe<{ fieldKey: string }[]>(
      `SELECT "fieldKey" FROM "OverrideLedger" WHERE "projectId" = 'pOverride'`,
    );
    expect(ledger.map((r) => r.fieldKey)).toContain("maxFootprint");
  });
});

describe("A1–A4 repository", () => {
  it("createProject parsel oluşturmuyor; ilk kayıt oluşturuyor", async () => {
    await prisma.project.create({
      data: {
        id: "pRepo",
        organizationId: SEEDED_ORGANIZATION_ID,
        name: "Repo",
        projectType: "kentselDonusum",
        tier: "K2",
      },
    });
    expect(await prisma.parcel.findUnique({ where: { projectId: "pRepo" } })).toBeNull();

    await saveParcel("pRepo", { province: "Ankara", area: "800.00" }, prisma);
    const parcel = await prisma.parcel.findUnique({ where: { projectId: "pRepo" } });
    expect(parcel?.province).toBe("Ankara");
  });

  it("yarım kayıt serbest — eksik alan ENGELLEMİYOR", async () => {
    // A1–A4'ün tüm alanları nullable; ilke 7 gereği eksiklik kaydı durdurmaz.
    await saveZoningData("pRepo", { groundCoverageRatio: "0.3000" }, prisma);
    const zoning = await prisma.zoningData.findFirst({
      where: { parcel: { projectId: "pRepo" } },
    });
    expect(Number(zoning?.groundCoverageRatio)).toBeCloseTo(0.3, 6);
    // Girilmemiş alanlar null kalıyor
    expect(zoning?.floorAreaRatio).toBeNull();
    expect(zoning?.maxFloorCount).toBeNull();
  });

  it("başka organizasyonun projesine yazılamıyor", async () => {
    await prisma.organization.create({ data: { id: "orgOther", name: "Öteki" } });
    await prisma.project.create({
      data: {
        id: "pOther",
        organizationId: "orgOther",
        name: "Öteki",
        projectType: "yeniYapi",
        tier: "K1",
      },
    });
    await expect(saveParcel("pOther", { province: "X" }, prisma)).rejects.toThrow(
      /DATUM_NOT_FOUND/,
    );
  });
});

describe("A4 çoğunluk göstergesi", () => {
  it("anlaşan pay oranını eşikle karşılaştırıyor", async () => {
    await createProjectWithZoning({ id: "pMaj" });
    await addStakeholder("pMaj", { name: "A", shareRatio: "0.5000", agreementStance: "olumlu" }, prisma);
    await addStakeholder("pMaj", { name: "B", shareRatio: "0.3000", agreementStance: "olumlu" }, prisma);
    await addStakeholder("pMaj", { name: "C", shareRatio: "0.2000", agreementStance: "itirazci" }, prisma);

    const m = await computeMajority("pMaj", prisma);

    expect(m.stakeholderCount).toBe(3);
    expect(m.totalShare).toBeCloseTo(1, 6);
    expect(m.agreedShare).toBeCloseTo(0.8, 6);
    // Fixture eşiği 0,6667
    expect(m.threshold).toBeCloseTo(0.6667, 4);
    expect(m.reached).toBe(true);
    expect(m.warnings.map((w) => w.code)).not.toContain("MAJORITY_NOT_REACHED");
  });

  it("eşik altında UYARIR ama engellemez", async () => {
    await createProjectWithZoning({ id: "pMaj2" });
    await addStakeholder("pMaj2", { name: "A", shareRatio: "0.5000", agreementStance: "olumlu" }, prisma);
    await addStakeholder("pMaj2", { name: "B", shareRatio: "0.5000", agreementStance: "kararsiz" }, prisma);

    const m = await computeMajority("pMaj2", prisma);
    expect(m.agreedShare).toBeCloseTo(0.5, 6);
    expect(m.reached).toBe(false);
    expect(m.warnings.map((w) => w.code)).toContain("MAJORITY_NOT_REACHED");
  });

  it("paylar %100 etmiyorsa uyarıyor", async () => {
    await createProjectWithZoning({ id: "pMaj3" });
    await addStakeholder("pMaj3", { name: "A", shareRatio: "0.4000", agreementStance: "olumlu" }, prisma);

    const m = await computeMajority("pMaj3", prisma);
    expect(m.totalShare).toBeCloseTo(0.4, 6);
    expect(m.warnings.map((w) => w.code)).toContain("SHARES_DO_NOT_SUM");
  });

  it("pakete bağlı olmayan projede eşik yok — gösterge hesaplanmıyor", async () => {
    await createProjectWithZoning({ id: "pMaj4", bind: false });
    await addStakeholder("pMaj4", { name: "A", shareRatio: "1.0000", agreementStance: "olumlu" }, prisma);

    const m = await computeMajority("pMaj4", prisma);
    expect(m.threshold).toBeNull();
    expect(m.reached).toBeNull();
    expect(m.warnings.map((w) => w.code)).toContain("PACKAGE_NOT_BOUND");
  });
});

describe("ilke 2 — yeni sürüm eski projeyi ETKİLEMİYOR", () => {
  it("paket yeni sürümle güncellense de proje eski kuralı okumaya devam ediyor", async () => {
    await createProjectWithZoning({ id: "pFrozen", withGeometry: true });
    const before = await computeAndStoreL0("pFrozen", prisma);
    expect(before.envelopeArea).toBeCloseTo(222.0, 1);

    // Yeni sürüm: köşe davranışı round'a çevriliyor (alanı büyütür)
    const pkg = await prisma.regionPackage.findFirstOrThrow({
      where: { adminUnit: FIXTURE_ADMIN_UNIT },
    });
    const v2 = await prisma.regionPackageVersion.create({
      data: {
        regionPackageId: pkg.id,
        version: "0.2.0-fixture",
        effectiveFrom: new Date("2026-06-01"),
        status: "draft",
      },
    });
    await prisma.zoningRuleSet.create({
      data: {
        regionPackageVersionId: v2.id,
        ruleKey: "default",
        farCalculationBasis: "brut",
        offsetJoinType: "round",
      },
    });
    await prisma.regionPackageVersion.update({
      where: { id: v2.id },
      data: { status: "published", publishedAt: new Date() },
    });

    // Proje hâlâ v1'e bağlı → sonuç DEĞİŞMEMELİ
    const after = await computeAndStoreL0("pFrozen", prisma);
    expect(after.envelopeArea).toBeCloseTo(before.envelopeArea!, 6);

    const reader = await createRuleReader("pFrozen", prisma);
    expect((await reader.zoningRuleSet())?.offsetJoinType).toBe("miter");
  });
});
