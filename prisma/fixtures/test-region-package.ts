import type { PrismaClient } from "@prisma/client";

/**
 * ════════════════════════════════════════════════════════════════════════
 *  TEST FIXTURE — GERÇEK MEVZUAT DEĞİLDİR.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Pilot bölge paketi bir ALAN UZMANI çıktısıdır ve Faz 0 işidir
 * (`mvp-spesifikasyonu.md`:163, bloke ettiği: İP-2, İP-3). Henüz yok.
 *
 * Bu paket, kural motoru ve L0 zarf hesabı test edilebilsin diye vardır.
 * Değerler GERÇEKÇİ ama UYDURMADIR. Hiçbiri Türk imar mevzuatının kaynağı
 * değildir ve öyle sunulamaz.
 *
 * KARIŞMAMASI İÇİN:
 *   · `adminUnit` = "TEST-FIXTURE" — sorgulanabilir ayraç
 *   · `db:seed`'e GİRMEZ; ayrı komutla (`db:fixture`) ve testlerle yüklenir
 *   · Paket adı da açıkça test paketi olduğunu söyler
 *
 * KAPSAM: yalnızca İP-2'nin ihtiyacı. İP-3'ün tabloları (ParkingRule,
 * RequiredSpaceRule, CoreRule, FireSafetyRule…) BİLİNÇLİ OLARAK BOŞ bırakıldı
 * — doldurmak, olmayan bir mevzuatı varmış gibi göstermek olurdu.
 */

export const FIXTURE_ADMIN_UNIT = "TEST-FIXTURE";
export const FIXTURE_PACKAGE_NAME = "Test Fixture — gerçek mevzuat değildir";
export const FIXTURE_VERSION = "0.1.0-fixture";

/** Yükseklik ölçüm referansı kataloğu — i18n anahtarları. */
const HEIGHT_REFERENCES = [
  { ruleKey: "tabiiZemin", labelKey: "heightReference.tabiiZemin", sortOrder: 1 },
  { ruleKey: "tesviyeEdilmisZemin", labelKey: "heightReference.tesviyeEdilmisZemin", sortOrder: 2 },
  { ruleKey: "yolKotu", labelKey: "heightReference.yolKotu", sortOrder: 3 },
  { ruleKey: "binaGirisKotu", labelKey: "heightReference.binaGirisKotu", sortOrder: 4 },
] as const;

/**
 * Özel kısıt kontrol listesi — 11 madde, `etut-veri-modeli.md` bölüm 3'ten.
 *
 * `effectTarget`/`effectKind` YALNIZCA yapısal olarak apaçık olanlarda
 * doldurulmuştur. Diğerleri `none`: bir kısıtın emsali mi yoksa taban alanını
 * mı düşürdüğü YEREL MEVZUAT SORUSUDUR ve uydurulamaz. Pilot paket geldiğinde
 * alan uzmanı dolduracak.
 */
const SPECIAL_CONSTRAINTS = [
  { ruleKey: "korumaSitAlani", isBlocking: false, effectTarget: "none", effectKind: "none" },
  // Mania kotu bir YÜKSEKLİK tavanıdır — bu yapısal olarak kesindir.
  { ruleKey: "maniaKotu", isBlocking: false, effectTarget: "maxHeight", effectKind: "cap" },
  { ruleKey: "askeriYasakBolge", isBlocking: true, effectTarget: "none", effectKind: "none" },
  { ruleKey: "ormanSiniri", isBlocking: false, effectTarget: "none", effectKind: "none" },
  { ruleKey: "kiyiKenarCizgisi", isBlocking: false, effectTarget: "none", effectKind: "none" },
  { ruleKey: "afetRiski", isBlocking: false, effectTarget: "none", effectKind: "none" },
  { ruleKey: "kamulastirmaSerhi", isBlocking: true, effectTarget: "none", effectKind: "none" },
  { ruleKey: "yolGenisletme", isBlocking: false, effectTarget: "none", effectKind: "none" },
  { ruleKey: "enerjiNakilHatti", isBlocking: false, effectTarget: "none", effectKind: "none" },
  { ruleKey: "arkeolojikSondajSarti", isBlocking: false, effectTarget: "none", effectKind: "none" },
  // Yeşil alan terki taban alanını ORANLA düşürür — yapısal olarak kesin.
  {
    ruleKey: "yesilAlanTerki",
    isBlocking: false,
    effectTarget: "maxFootprint",
    effectKind: "multiply",
  },
] as const;

export interface FixtureResult {
  regionPackageId: string;
  versionId: string;
}

/**
 * Fixture paketini oluşturur ve YAYIMLAR.
 *
 * Yayım şart: proje yalnızca `published` bir sürüme bağlanabilir. Ama yayımdan
 * sonra satırlar DEĞİŞMEZ (ilke 2) — fixture yerinde güncellenemez, yeniden
 * seed edilir (`prisma migrate reset` + `db:fixture`).
 *
 * `publishVersion()` KULLANILMAZ: o `src/lib/db/client.ts`'in tekil istemcisine
 * bağlıdır; fixture ise testlerde ayrı bir PGlite istemcisiyle de yüklenir.
 * Yayım burada elle, aynı sırayla yapılır (önce içerik, sonra status).
 */
export async function loadTestRegionPackage(
  prisma: PrismaClient,
  organizationId: string,
): Promise<FixtureResult> {
  const existing = await prisma.regionPackage.findFirst({
    where: { organizationId, adminUnit: FIXTURE_ADMIN_UNIT },
    include: { versions: { where: { version: FIXTURE_VERSION } } },
  });

  if (existing?.versions[0]) {
    return { regionPackageId: existing.id, versionId: existing.versions[0].id };
  }

  const pkg =
    existing ??
    (await prisma.regionPackage.create({
      data: {
        organizationId,
        name: FIXTURE_PACKAGE_NAME,
        country: "TR",
        adminUnit: FIXTURE_ADMIN_UNIT,
      },
    }));

  const version = await prisma.regionPackageVersion.create({
    data: {
      regionPackageId: pkg.id,
      version: FIXTURE_VERSION,
      effectiveFrom: new Date("2026-01-01"),
      status: "draft",
    },
  });

  const regionPackageVersionId = version.id;

  // --- İmar kural seti -----------------------------------------------------
  // Tek satır: birden çok olsaydı hangisinin seçileceğini doküman tanımlamıyor
  // ve okuyucu uyarı verip null dönerdi.
  await prisma.zoningRuleSet.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      farCalculationBasis: "brut",
      heightReferenceRuleKey: "tabiiZemin",
      // Köşe davranışı: bu fixture "miter" seçiyor (haritacı çizimi).
      // GERÇEK paket bunu mevzuat yorumuna göre belirleyecek — miter ile
      // round arasında %8'e varan alan farkı var.
      offsetJoinType: "miter",
      // Emsal harici alan kuralları TANIMSIZ: onlar program girildikten sonra
      // (A5, İP-3) anlam kazanır. null bırakmak İP-2'nin uyarı üretmesini sağlar.
      farExemptionRules: undefined,
    },
  });

  await prisma.heightReferenceCatalog.createMany({
    data: HEIGHT_REFERENCES.map((h) => ({ ...h, regionPackageVersionId })),
  });

  await prisma.specialConstraintCatalog.createMany({
    data: SPECIAL_CONSTRAINTS.map((c, i) => ({
      regionPackageVersionId,
      ruleKey: c.ruleKey,
      labelKey: `specialConstraint.${c.ruleKey}`,
      isBlocking: c.isBlocking,
      effectTarget: c.effectTarget,
      effectKind: c.effectKind,
      sortOrder: i + 1,
    })),
  });

  // --- Paydaş anlaşma kuralları -------------------------------------------
  // UYDURMA DEĞER. Gerçek eşik yerel mevzuattan gelir; buradaki sayı yalnızca
  // çoğunluk göstergesinin test edilebilmesi içindir.
  await prisma.stakeholderConsentRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      majorityThreshold: "0.6667",
      objectionPeriodDays: 30,
    },
  });

  // --- Para birimi ---------------------------------------------------------
  // `Project.currency` "paketten gelir, ezilebilir" (veri modeli :131) ama
  // paketin HANGİ tablosundan geldiği dokümanda yazmıyor — İP-1 bunu
  // TaxAndIndexRule.indexSeries üzerinden çözmüştü. Fixture aynı yolu izler.
  // (Açık kayıt: bu bir yer tutucu, tasarım değil.)
  await prisma.taxAndIndexRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "currency",
      name: "Para birimi",
      indexSeries: { currency: "TRY" },
    },
  });

  // --- Yayım ---------------------------------------------------------------
  // Sıra önemli: içerik ÖNCE yazılır (draft'ken), status EN SON çevrilir.
  // Ters sırada yazım kendi değişmezlik trigger'ına takılırdı.
  await prisma.regionPackageVersion.update({
    where: { id: regionPackageVersionId },
    data: { status: "published", publishedAt: new Date() },
  });

  return { regionPackageId: pkg.id, versionId: regionPackageVersionId };
}

/** Bu paket bir test fixture'ı mı? Arayüz ve raporlar bunu göstermeli. */
export function isTestFixturePackage(adminUnit: string): boolean {
  return adminUnit === FIXTURE_ADMIN_UNIT;
}
