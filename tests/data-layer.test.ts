import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Prisma, PrismaClient } from "@prisma/client";
import { scopedPrisma } from "@/lib/db/client";
import { createTestDb, seedOrganization, type TestDb } from "./helpers/db";

/**
 * VERİ KATMANI TESTLERİ — süreç içi Postgres (PGlite) üzerinde.
 *
 * İP-1 bu katmanı test EDEMİYORDU: Prisma'ya gerçek bir bağlantı gerekiyordu,
 * makinede Docker/Postgres yoktu. `src/lib/db/client.ts` içindeki "KAYDA GEÇEN
 * RİSK" yorumu tam da bunu işaret ediyordu. İP-2'de kapatıldı.
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

describe("PGlite adapter", () => {
  it("temel işlemler çalışıyor", async () => {
    await seedOrganization(prisma, "orgBasic");

    const project = await prisma.project.create({
      data: {
        organizationId: "orgBasic",
        name: "Temel",
        projectType: "yeniYapi",
        tier: "K1",
        parcel: { create: { area: "1000.00" } },
      },
      include: { parcel: true },
    });

    expect(project.parcel).not.toBeNull();
    // Decimal string'e doğru dönüyor mu — para/alan alanlarında float yok
    expect(project.parcel?.area?.toString()).toBe("1000");
  });

  it("$transaction çalışıyor", async () => {
    await prisma.$transaction(async (tx) => {
      await tx.organization.create({ data: { id: "orgTx", name: "Tx" } });
      await tx.project.create({
        data: { organizationId: "orgTx", name: "Tx", projectType: "yeniYapi", tier: "K2" },
      });
    });
    const found = await prisma.project.findMany({ where: { organizationId: "orgTx" } });
    expect(found).toHaveLength(1);
  });
});

describe("kiracı izolasyonu (scopedPrisma)", () => {
  beforeAll(async () => {
    await seedOrganization(prisma, "orgA");
    await seedOrganization(prisma, "orgB");
    await prisma.project.create({
      data: { id: "pA", organizationId: "orgA", name: "A projesi", projectType: "yeniYapi", tier: "K1" },
    });
    await prisma.project.create({
      data: { id: "pB", organizationId: "orgB", name: "B projesi", projectType: "kentselDonusum", tier: "K2" },
    });
  });

  it("findMany yalnızca kendi organizasyonunu görüyor", async () => {
    const a = scopedPrisma(prisma, "orgA");
    const projects = await a.project.findMany();
    expect(projects.map((p) => p.id)).toEqual(["pA"]);
  });

  it("findUnique başka organizasyonun kaydını GÖRMÜYOR", async () => {
    // findUnique organizationId kabul etmez; extension onu findFirst'e çevirir.
    // Bu çeviri olmasaydı burada orgB'nin projesi sızardı.
    const a = scopedPrisma(prisma, "orgA");
    expect(await a.project.findUnique({ where: { id: "pB" } })).toBeNull();
    expect((await a.project.findUnique({ where: { id: "pA" } }))?.id).toBe("pA");
  });

  it("create organizationId'yi kendisi enjekte ediyor", async () => {
    const a = scopedPrisma(prisma, "orgA");
    // organizationId VERİLMİYOR — extension eklemeli.
    // Cast gerekiyor çünkü tip hâlâ alanı zorunlu görüyor; repository katmanı da
    // aynı yolu izliyor (projects/repository.ts:63). Ergonomik bir eksik, hata değil.
    const created = await a.project.create({
      data: { name: "Enjekte", projectType: "ilaveKat", tier: "K1" } as Prisma.ProjectUncheckedCreateInput,
    });
    expect(created.organizationId).toBe("orgA");
  });

  it("count yalnızca kendi organizasyonunu sayıyor", async () => {
    const b = scopedPrisma(prisma, "orgB");
    expect(await b.project.count()).toBe(1);
  });

  it("başka organizasyonun kaydı GÜNCELLENEMİYOR", async () => {
    const a = scopedPrisma(prisma, "orgA");
    await expect(
      a.project.update({ where: { id: "pB" }, data: { name: "ele geçirildi" } }),
    ).rejects.toThrow(/DATUM_TENANT_SCOPE/);

    // orgB'nin kaydı değişmemiş olmalı
    const untouched = await prisma.project.findUnique({ where: { id: "pB" } });
    expect(untouched?.name).toBe("B projesi");
  });

  it("başka organizasyonun kaydı SİLİNEMİYOR", async () => {
    const a = scopedPrisma(prisma, "orgA");
    await expect(a.project.delete({ where: { id: "pB" } })).rejects.toThrow(
      /DATUM_TENANT_SCOPE/,
    );
    expect(await prisma.project.findUnique({ where: { id: "pB" } })).not.toBeNull();
  });

  it("bölge paketi de kapsamlanıyor", async () => {
    const a = scopedPrisma(prisma, "orgA");
    const packages = await a.regionPackage.findMany();
    expect(packages).toHaveLength(1);
    expect(packages[0]?.organizationId).toBe("orgA");
  });
});

describe("değişmezlik Prisma üzerinden de zorlanıyor (ilke 2)", () => {
  it("yayımlanmış sürüme kural eklenemiyor", async () => {
    const { version } = await seedOrganization(prisma, "orgFrozen");

    // draft iken yazılabilmeli
    await prisma.spaceShapeFactorRule.create({
      data: {
        regionPackageVersionId: version.id,
        ruleKey: "salon",
        spaceType: "salon",
        shapeFactor: "4.2",
      },
    });

    await prisma.regionPackageVersion.update({
      where: { id: version.id },
      data: { status: "published", publishedAt: new Date() },
    });

    // yayımdan sonra reddedilmeli — koruma veritabanında, uygulama katmanında değil
    await expect(
      prisma.spaceShapeFactorRule.create({
        data: {
          regionPackageVersionId: version.id,
          ruleKey: "mutfak",
          spaceType: "mutfak",
          shapeFactor: "4.4",
        },
      }),
    ).rejects.toThrow(/DATUM_FROZEN/);

    await expect(
      prisma.spaceShapeFactorRule.updateMany({
        where: { regionPackageVersionId: version.id },
        data: { shapeFactor: "9.9" },
      }),
    ).rejects.toThrow(/DATUM_FROZEN/);
  });

  it("proje yalnızca yayımlanmış sürüme bağlanabiliyor", async () => {
    const { version } = await seedOrganization(prisma, "orgBind");
    const project = await prisma.project.create({
      data: { organizationId: "orgBind", name: "Bağla", projectType: "yeniYapi", tier: "K1" },
    });

    await expect(
      prisma.project.update({
        where: { id: project.id },
        data: { regionPackageVersionId: version.id },
      }),
    ).rejects.toThrow(/DATUM_NOT_PUBLISHED/);

    await prisma.regionPackageVersion.update({
      where: { id: version.id },
      data: { status: "published", publishedAt: new Date() },
    });

    const bound = await prisma.project.update({
      where: { id: project.id },
      data: { regionPackageVersionId: version.id },
    });
    expect(bound.regionPackageVersionId).toBe(version.id);
  });
});
