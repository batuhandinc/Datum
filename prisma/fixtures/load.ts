import { PrismaClient } from "@prisma/client";
import { loadTestRegionPackage, FIXTURE_ADMIN_UNIT } from "./test-region-package";

/**
 * Test fixture paketini yükler — `npm run db:fixture`.
 *
 * `db:seed`'den AYRIDIR ve ona dahil değildir: fixture uydurma değerler taşır
 * ve gerçek pilot paketle karışmamalıdır.
 *
 * Yayımlanmış bir sürüm DEĞİŞMEZ olduğu için fixture yerinde güncellenemez.
 * Değiştirmek için: `npx prisma migrate reset --force && npm run db:seed && npm run db:fixture`
 */

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.findFirst();
  if (!organization) {
    throw new Error(
      "Organizasyon bulunamadı. Önce `npm run db:seed` çalıştırın.",
    );
  }

  const { versionId } = await loadTestRegionPackage(prisma, organization.id);

  console.log(`Test fixture yüklendi: sürüm ${versionId}`);
  console.log(`  adminUnit = "${FIXTURE_ADMIN_UNIT}" — gerçek mevzuat DEĞİLDİR.`);
  console.log("  Kapsam: İP-2 (imar kural seti, özel kısıt listesi, yükseklik referansı,");
  console.log("  anlaşma kuralı). İP-3'ün tabloları bilinçli olarak boş.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
