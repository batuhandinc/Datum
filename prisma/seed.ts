import { PrismaClient } from "@prisma/client";

/**
 * SEED — İP-1 teslimatı 2.
 *
 * etut-veri-modeli.md §1.1 (:18): "Tek organizasyon seed edilir, arayüzde hiç görünmez."
 *
 * Bölge paketi BOŞ bir draft sürümle oluşturulur. Kural İÇERİĞİ burada
 * doldurulmaz — pilot bölgenin kural seti bir ALAN UZMANI çıktısıdır ve
 * Faz 0 işidir (mvp-spesifikasyonu.md:163). Şema, içerik hazır olmadan
 * tanımlanabilsin diye böyle tasarlandı.
 *
 * İlke 1 gereği buraya hiçbir eşik, katsayı veya kalem kodu YAZILMAZ.
 */

const prisma = new PrismaClient();

const ORGANIZATION_ID = "org_datum_default";
const ORGANIZATION_NAME = "Datum";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: ORGANIZATION_ID },
    update: {},
    create: { id: ORGANIZATION_ID, name: ORGANIZATION_NAME },
  });
  console.log(`organizasyon: ${organization.name} (${organization.id})`);

  const existing = await prisma.regionPackage.findFirst({
    where: { organizationId: organization.id },
  });

  const pkg =
    existing ??
    (await prisma.regionPackage.create({
      data: {
        organizationId: organization.id,
        name: "Pilot Bölge",
        country: "TR",
        adminUnit: "TANIMSIZ",
      },
    }));
  console.log(`bölge paketi: ${pkg.name} (${pkg.id})`);

  const version = await prisma.regionPackageVersion.findFirst({
    where: { regionPackageId: pkg.id, version: "0.1.0-draft" },
  });

  if (version) {
    console.log(`sürüm zaten var: ${version.version} [${version.status}]`);
  } else {
    const created = await prisma.regionPackageVersion.create({
      data: {
        regionPackageId: pkg.id,
        version: "0.1.0-draft",
        effectiveFrom: new Date("2026-01-01"),
        status: "draft",
      },
    });
    console.log(`sürüm: ${created.version} [${created.status}] — kural içeriği BOŞ (Faz 0)`);
  }

  const orgCount = await prisma.organization.count();
  if (orgCount !== 1) {
    throw new Error(
      `Beklenen tek organizasyon, bulunan ${orgCount}. Tek kiracı varsayımı bozuldu.`,
    );
  }
  console.log("\nSeed tamam. Tek organizasyon doğrulandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
