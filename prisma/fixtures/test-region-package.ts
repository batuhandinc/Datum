import type { PrismaClient } from "@prisma/client";
import { publishVersion } from "../../src/lib/region-package/version";

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
 * KAPSAM: İP-2 (imar kural seti, özel kısıt listesi, yükseklik referansı,
 * anlaşma kuralı) · İP-3 (çekirdek, otopark, yangın, tesisat katsayıları,
 * zorunlu servis mekanları) · İP-4 (birim bölümleme ve yapı elemanı kuralları).
 * İP-5 ve sonrasının tabloları BİLİNÇLİ OLARAK BOŞ — doldurmak, olmayan bir
 * mevzuatı varmış gibi göstermek olurdu.
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

  // ==========================================================================
  // İP-3 KURALLARI — hepsi UYDURMA. Gerçek Türk mevzuatı DEĞİLDİR.
  //
  // Amaç yalnızca çekirdek yerleşiminin, servis mekanı motorunun ve otopark
  // çözücüsünün uçtan uca test edilebilmesi. Pilot bölge paketi geldiğinde
  // her satır alan uzmanı tarafından değiştirilecektir.
  // ==========================================================================

  // --- Çekirdek ------------------------------------------------------------
  await prisma.coreRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      elevatorRequiredFloorThreshold: 4,
      elevatorRequiredHeightThreshold: "12.50",
      minElevatorCount: 1,
      stretcherElevatorRequired: true,
      minStretcherCabinWidth: "1.20",
      minStretcherCabinDepth: "2.30",
      fireElevatorHeightThreshold: "51.50",
      minStairWidth: "1.20",
      minCirculationWidth: "1.50",
      maxEscapeDistance: "30.00",
      elevatorKgPerPerson: "75.00",
    },
  });

  // --- Otopark -------------------------------------------------------------
  // areaPerSpace park yerinin KENDİ alanı değil, GERÇEK VERİMDİR: kolon
  // kayıpları, rampa başı ölü alanlar ve dönüş yarıçapları içindedir.
  // 2,50 × 5,00 = 12,5 m²'lik bir yer, koridorla birlikte ~28 m² tutar.
  // Bu sayı İP-10 geriye dönük doğrulamada kalibre edilecektir.
  await prisma.parkingRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      requirementFormula: "ceil(unitCount * 1)",
      spaceWidth: "2.50",
      spaceLength: "5.00",
      maxRampSlope: "0.1800",
      accessibleRatio: "0.0500",
      maneuveringAisleWidth: "5.00",
      bicycleRatio: "0.1000",
      areaPerSpace: "28.000",
      accessibleAreaPerSpace: "35.000",
      bicycleAreaPerSpace: "2.000",
    },
  });

  // --- Yangın güvenliği ----------------------------------------------------
  await prisma.fireSafetyRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      firePumpHeightThreshold: "30.50",
      sprinklerAreaThreshold: "2000.00",
      detectorCoverageArea: "60.00",
      pressurizationThreshold: "21.50",
      fireReserveVolume: "60.00",
    },
  });

  // --- Tesisat katsayıları -------------------------------------------------
  // Doküman §12.3 bunları "bölüm 7'deki servis mekanı formüllerinin 'paket
  // katsayısı' dediği ama tanımlamadığı değerler" diye tarif ediyor.
  await prisma.utilityCoefficientSet.create({
    data: {
      regionPackageVersionId,
      ruleKey: "default",
      demandPowerPerUnit: "3.0000",
      demandPowerPerCommonArea: "0.0200",
      transformerPowerThreshold: "250.0000",
      personsPerUnit: "3.5000",
      litresPerPerson: "150.0000",
      generatorSizingFactor: "0.6000",
      heatLossPerArea: "60.0000",
      shelterAreaPerGasProofDoor: "50.0000",
      shelterAreaPerPerson: "1.0000",
      shelterPersonsPerUnit: "3.5000",
    },
  });

  // --- Zorunlu servis mekanları -------------------------------------------
  // Tetikleyiciler dokümanın saydığı dört sürücüden (bağımsız bölüm sayısı,
  // alan, güç, yükseklik). Alan formülleri yayım kapısında doğrulanacak.
  await prisma.requiredSpaceRule.createMany({
    data: [
      {
        regionPackageVersionId,
        ruleKey: "shelter",
        serviceSpaceType: "shelter",
        triggerType: "unitCount",
        threshold: "12.0000",
        areaFormula: "personCount * 1",
      },
      {
        regionPackageVersionId,
        ruleKey: "electricalRoom",
        serviceSpaceType: "electricalRoom",
        triggerType: "demandPowerKW",
        threshold: "100.0000",
        areaFormula: "12",
      },
      {
        regionPackageVersionId,
        ruleKey: "waterTank",
        serviceSpaceType: "waterTank",
        triggerType: "unitCount",
        threshold: "20.0000",
        areaFormula: "max(personCount * 0.15, 15)",
      },
      {
        regionPackageVersionId,
        ruleKey: "fireSystem",
        serviceSpaceType: "fireSystem",
        triggerType: "buildingHeight",
        threshold: "30.5000",
        areaFormula: "20",
      },
      {
        regionPackageVersionId,
        ruleKey: "generator",
        serviceSpaceType: "generator",
        triggerType: "demandPowerKW",
        threshold: "250.0000",
        areaFormula: "18",
      },
      {
        regionPackageVersionId,
        ruleKey: "heatingCenter",
        serviceSpaceType: "heatingCenter",
        triggerType: "totalFloorArea",
        threshold: "3000.0000",
        areaFormula: "totalFloorArea * 0.004",
      },
      {
        regionPackageVersionId,
        ruleKey: "janitorApartment",
        serviceSpaceType: "janitorApartment",
        triggerType: "unitCount",
        threshold: "30.0000",
        areaFormula: "45",
      },
      {
        regionPackageVersionId,
        ruleKey: "wasteRoom",
        serviceSpaceType: "wasteRoom",
        triggerType: "unitCount",
        threshold: "8.0000",
        areaFormula: "max(unitCount * 0.15, 6)",
      },
      {
        regionPackageVersionId,
        ruleKey: "bicycleParking",
        serviceSpaceType: "bicycleParking",
        triggerType: "unitCount",
        threshold: "20.0000",
        areaFormula: "unitCount * 0.2",
      },
    ],
  });

  // --- Mekan şekil faktörü -------------------------------------------------
  // §1.5: G1 seviyesinde çevre ≈ k × √alan. Dikdörtgen için k ≈ 4,2.
  await prisma.spaceShapeFactorRule.createMany({
    data: (
      [
        ["salon", "4.2000"],
        ["yatakOdasi", "4.2000"],
        ["mutfak", "4.4000"],
        ["banyo", "4.4000"],
        ["hol", "5.0000"],
        ["koridor", "6.0000"],
      ] as const
    ).map(([spaceType, shapeFactor]) => ({
      regionPackageVersionId,
      ruleKey: spaceType,
      spaceType,
      shapeFactor,
    })),
  });

  // --- Mekan tipi → kategori ----------------------------------------------
  // §12.3: "varsayılan eşleme EVRENSELDİR; bölge paketi yalnızca EZEBİLİR."
  // Fixture yalnızca birkaç satır koyar; ezme değil, test verisi.
  await prisma.spaceTypeCategoryMap.createMany({
    data: (
      [
        ["salon", "yasam", false],
        ["yatakOdasi", "yasam", false],
        ["mutfak", "islak", true],
        ["banyo", "islak", true],
        ["wc", "islak", true],
        ["hol", "sirkulasyon", false],
        ["balkon", "dis", false],
      ] as const
    ).map(([spaceType, category, isWetArea]) => ({
      regionPackageVersionId,
      ruleKey: spaceType,
      spaceType,
      category,
      isWetArea,
      isRegionOverride: false,
    })),
  });

  // --- İP-4: birim ölçeğinde bölümleme kuralı -----------------------------
  // UYDURMA. Gerçek değerler pilot bölge çalışmasından (Faz 0) gelecek.
  await prisma.unitLayoutRule.create({
    data: {
      regionPackageVersionId,
      ruleKey: "konut",
      // Brüt birim alanı ÷ net mekan alanları toplamı. Türk apartmanında
      // duvar + birim içi sirkülasyon payı tipik olarak %20-30 arasıdır.
      grossToNetFactor: "1.2500",
      // `kat-plani-uretim-mimarisi.md` §9 madde 1 "%3 mü %5 mi" diye
      // soruyordu; karar KODDA DEĞİL burada verilir.
      areaTolerance: "0.0500",
      // Pencere alabilmesi için asgari cephe teması.
      minUnitFacadeLength: "3.00",
      // "Aşırı uzun dar birim olmasın" kısıtının sayısal karşılığı.
      maxUnitAspectRatio: "3.500",
    },
  });

  // --- İP-4: yapı elemanı ölçeğinde kurallar ------------------------------
  // Üç grup: mekan kuralları (asgari ölçü, aydınlatma), duvar kalınlıkları,
  // kolon aks aralığı. Hepsi UYDURMADIR.
  await prisma.buildingElementRule.createMany({
    data: [
      // Mekan tipi kuralları — asgari alan, asgari net genişlik, pencere oranı.
      ...(
        [
          ["salon", "12.000", "3.00", "0.1250"],
          ["yatakOdasi", "9.000", "2.50", "0.1250"],
          ["ebeveynYatak", "12.000", "2.80", "0.1250"],
          ["cocukOdasi", "9.000", "2.50", "0.1250"],
          ["mutfak", "6.000", "1.80", "0.1000"],
          ["banyo", "3.000", "1.20", null],
          ["ebeveynBanyo", "3.000", "1.20", null],
          ["wc", "1.200", "0.90", null],
          ["hol", "2.000", "1.10", null],
          ["koridor", "2.000", "1.20", null],
          ["balkon", "2.000", "1.00", null],
        ] as const
      ).map(([spaceType, minArea, minClearWidth, daylightRatio]) => ({
        regionPackageVersionId,
        ruleKey: `mekan-${spaceType}`,
        spaceType,
        minArea,
        minClearWidth,
        daylightRatio,
        minDoorWidth: "0.80",
      })),
      // Duvar kalınlıkları — tipe göre. Kural yoksa duvar ÜRETİLMEZ.
      ...(
        [
          ["dis", "0.300"],
          ["ic", "0.100"],
          ["islakHacim", "0.150"],
          ["saft", "0.200"],
          ["birimAyirici", "0.200"],
        ] as const
      ).map(([wallType, wallThickness]) => ({
        regionPackageVersionId,
        ruleKey: `duvar-${wallType}`,
        wallType,
        wallThickness,
      })),
      // Kolon aks aralığı — KABA. Otopark verimi doğrulaması için.
      {
        regionPackageVersionId,
        ruleKey: "aks",
        columnSpanX: "6.00",
        columnSpanY: "6.00",
      },
    ],
  });

  // --- Yayım ---------------------------------------------------------------
  // Sıra önemli: içerik ÖNCE yazılır (draft'ken), status EN SON çevrilir.
  // Ters sırada yazım kendi değişmezlik trigger'ına takılırdı.
  //
  // GERÇEK YAYIM KAPISINDAN geçiyoruz: publishVersion rowHash'leri yazar,
  // tableHashes'i hesaplar ve FORMÜLLERİ DOĞRULAR. Fixture'ın kendi
  // formülleri de böylece denetlenir — elle status çevirmek onları
  // doğrulanmadan yayımlardı.
  await publishVersion(regionPackageVersionId, prisma);

  return { regionPackageId: pkg.id, versionId: regionPackageVersionId };
}

/** Bu paket bir test fixture'ı mı? Arayüz ve raporlar bunu göstermeli. */
export function isTestFixturePackage(adminUnit: string): boolean {
  return adminUnit === FIXTURE_ADMIN_UNIT;
}
