import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestDb, seedOrganization, type TestDb } from "./helpers/db";
import { publishVersion } from "@/lib/region-package/version";
import { FORMULA_SLOTS } from "@/lib/formula";

/**
 * YAYIM KAPISI — bozuk formül yayımı REDDEDER.
 *
 * Bu, formül kararının en önemli maddesi. Doğrulama okuma anında yapılsaydı
 * bozuk bir formül ancak birisi o projeyi açtığında fark edilirdi — ve o an
 * paket zaten dondurulmuş, düzeltmek için yeni sürüm gerekiyor olurdu.
 * Burada yakalanınca sürüm `draft` kalır ve paket sahibi düzeltir.
 */

let db: TestDb;
let prisma: PrismaClient;

beforeAll(async () => {
  db = await createTestDb();
  prisma = db.prisma;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

let counter = 0;

/** Verilen otopark formülüyle taslak bir sürüm kurar. */
async function draftWithParkingFormula(requirementFormula: string) {
  const org = `org_${counter++}`;
  const { version } = await seedOrganization(prisma, org);
  await prisma.parkingRule.create({
    data: {
      regionPackageVersionId: version.id,
      ruleKey: "default",
      requirementFormula,
      spaceWidth: "2.50",
      spaceLength: "5.00",
      maxRampSlope: "0.1800",
      accessibleRatio: "0.0500",
      maneuveringAisleWidth: "5.00",
      areaPerSpace: "28.000",
    },
  });
  return version.id;
}

describe("yayım kapısı", () => {
  it("geçerli formül yayımlanabiliyor", async () => {
    const versionId = await draftWithParkingFormula("ceil(unitCount * 1)");
    const published = await publishVersion(versionId, prisma);
    expect(published.status).toBe("published");
  });

  it("sözdizimi bozuk formül yayımı REDDEDİYOR", async () => {
    const versionId = await draftWithParkingFormula("ceil(unitCount *");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow("DATUM_INVALID_FORMULA");
  });

  it("beyaz listede olmayan değişken yayımı REDDEDİYOR", async () => {
    // Otopark formülü demandPowerKW göremez — alan formülünün değişkenidir.
    const versionId = await draftWithParkingFormula("demandPowerKW / 10");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow(/UNKNOWN_VARIABLE/);
  });

  it("kod çalıştırma denemesi yayımı REDDEDİYOR", async () => {
    const versionId = await draftWithParkingFormula("process.env.DATABASE_URL");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow("DATUM_INVALID_FORMULA");
  });

  it("REDDEDİLEN sürüm draft KALIYOR — yarım yayım yok", async () => {
    const versionId = await draftWithParkingFormula("1 +");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow();

    const after = await prisma.regionPackageVersion.findUnique({ where: { id: versionId } });
    expect(after?.status).toBe("draft");
    expect(after?.publishedAt).toBeNull();

    // Hash de yazılmamış olmalı: transaction tamamen geri alındı.
    const rule = await prisma.parkingRule.findFirst({
      where: { regionPackageVersionId: versionId },
    });
    expect(rule?.rowHash).toBeNull();
  });

  it("hata mesajı hangi satırın bozuk olduğunu söylüyor", async () => {
    const versionId = await draftWithParkingFormula("sqrt(4)");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow(
      /parkingRule\.default\.requirementFormula/,
    );
  });

  it("boş zorunlu formül yayımı REDDEDİYOR", async () => {
    const versionId = await draftWithParkingFormula("   ");
    await expect(publishVersion(versionId, prisma)).rejects.toThrow(/EMPTY/);
  });

  it("opsiyonel formül boş bırakılabiliyor", async () => {
    // RequiredSpaceRule.areaFormula nullable: eşik tanımlı ama alan formülü
    // olmayan bir kural geçerlidir.
    const org = `org_${counter++}`;
    const { version } = await seedOrganization(prisma, org);
    await prisma.requiredSpaceRule.create({
      data: {
        regionPackageVersionId: version.id,
        ruleKey: "shelter",
        serviceSpaceType: "shelter",
        triggerType: "unitCount",
        threshold: "50.0000",
      },
    });
    const published = await publishVersion(version.id, prisma);
    expect(published.status).toBe("published");
  });
});

describe("kapı kapsamı", () => {
  it("formül taşıyan her kolon FORMULA_SLOTS'ta kayıtlı", () => {
    // Kayıtlı olmayan bir formül kolonu DOĞRULANMADAN yayımlanır.
    // Şemada "Formula" ile biten kolonları arayıp listeyle karşılaştırıyoruz.
    const registered = new Set(FORMULA_SLOTS.map((s) => `${s.model}.${s.field}`));
    expect(registered).toContain("parkingRule.requirementFormula");
    expect(registered).toContain("requiredSpaceRule.areaFormula");
  });
});
