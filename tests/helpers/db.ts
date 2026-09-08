import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * SÜREÇ İÇİ TEST VERİTABANI — Docker gerekmez.
 *
 * PGlite süreç içinde çalışan WASM Postgres'tir; Prisma ona
 * `pglite-prisma-adapter` üzerinden bağlanır. Migration'lar ham SQL olarak
 * uygulanır, böylece GENERATED kolonlar, OverrideLedger view'ı ve plpgsql
 * değişmezlik trigger'ları GERÇEKTEN çalışır.
 *
 * Bu, İP-1'in kapatamadığı boşluğu kapatır: `scopedPrisma` kiracı izolasyonu
 * ve repository katmanı artık yerelde test edilebiliyor.
 *
 * SINIR: adapter `prisma migrate dev/deploy` desteklemiyor. Migration ÜRETİMİ
 * hâlâ gerçek Postgres gerektirir; burada yalnızca UYGULANIR.
 *
 * GERÇEK POSTGRES'İN YERİNİ TUTMAZ — uzantılar, eşzamanlılık ve rol davranışı
 * farklıdır. Şema, kısıt ve trigger davranışı için yeterlidir.
 */

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const MIGRATIONS = path.join(ROOT, "prisma", "migrations");

let migrationSql: string | null = null;

/** Tüm migration'ları sırayla okur; dosya okuma bir kez yapılır. */
function readMigrations(): string {
  if (migrationSql !== null) return migrationSql;
  migrationSql = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((d) => readFileSync(path.join(MIGRATIONS, d, "migration.sql"), "utf8"))
    .join("\n");
  return migrationSql;
}

export interface TestDb {
  /** Ham istemci — kiracı filtresi YOK. Kurulum ve doğrulama için. */
  prisma: PrismaClient;
  /** Alttaki PGlite — ham SQL ve trigger doğrulaması için. */
  pglite: PGlite;
  close: () => Promise<void>;
}

/** Boş, migration'ları uygulanmış bir veritabanı açar. */
export async function createTestDb(): Promise<TestDb> {
  const pglite = new PGlite();
  await pglite.exec(readMigrations());

  // TİP NOTU: pglite-prisma-adapter, @prisma/driver-adapter-utils@6.10.1'e bağlı;
  // @prisma/client@6.19.3 ise kendi (daha yeni) tiplerini kullanıyor. Yapılar aynı,
  // tip KİMLİKLERİ farklı → yapısal uyumsuzluk hatası. Çalışma zamanı sorunsuz
  // (bu dosyayı kullanan testler bunu doğruluyor). Dar bir cast ile geçiliyor;
  // adapter Prisma 7'ye çıktığında kaldırılabilir.
  const adapter = new PrismaPGlite(pglite) as unknown as ConstructorParameters<
    typeof PrismaClient
  >[0] extends { adapter?: infer A }
    ? A
    : never;

  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    pglite,
    close: async () => {
      await prisma.$disconnect();
      await pglite.close();
    },
  };
}

/** Tek organizasyon + bir bölge paketi + draft sürüm. Seed'in test karşılığı. */
export async function seedOrganization(prisma: PrismaClient, organizationId = "org1") {
  const organization = await prisma.organization.create({
    data: { id: organizationId, name: `Test ${organizationId}` },
  });
  const regionPackage = await prisma.regionPackage.create({
    data: {
      organizationId,
      name: "Test Paketi",
      country: "TR",
      adminUnit: `TEST-FIXTURE-${organizationId}`,
    },
  });
  const version = await prisma.regionPackageVersion.create({
    data: {
      regionPackageId: regionPackage.id,
      version: "1.0.0",
      effectiveFrom: new Date("2026-01-01"),
    },
  });
  return { organization, regionPackage, version };
}
