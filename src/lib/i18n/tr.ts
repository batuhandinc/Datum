import type { Warning, WarningCode } from "@/lib/warnings";

/**
 * TÜRKÇE ARAYÜZ METİNLERİ.
 *
 * KONVANSİYON: kodda gömülü Türkçe metin YOKTUR. Arayüzde görünen her dize
 * bu katmandan gelir. Kod ve şema tanımlayıcıları İngilizcedir.
 *
 * Enum değerleri (yeniYapi, ayrik, radye, ebeveynBanyo…) TANIMLAYICIDIR,
 * metin değil — dokümanın sabitlediği kimliklerdir ve çevrilmez. Kullanıcıya
 * gösterilecek karşılıkları aşağıdaki sözlüklerdedir.
 *
 * Bir test, her Prisma enum'unun burada TAM karşılığı olduğunu doğrular:
 * eksik etiket arayüzde sessizce `undefined` basardı.
 */

export const tr = {
  app: {
    name: "Datum",
    tagline: "Etüt ve fizibilite",
  },

  common: {
    save: "Kaydet",
    saved: "Kaydedildi",
    optional: "opsiyonel",
    notEntered: "Girilmedi",
    computed: "Hesaplanan",
    warnings: "Uyarılar",
    noWarnings: "Uyarı yok",
    back: "Geri",
    next: "İleri",
  },

  project: {
    title: "Projeler",
    empty: "Henüz proje yok.",
    new: "Yeni proje",
    create: "Oluştur",
    save: "Kaydet",
    delete: "Sil",
    fields: {
      name: "Proje adı",
      projectType: "Proje tipi",
      status: "Durum",
      tier: "Kademe",
      regionPackageVersion: "Bölge paketi sürümü",
      currency: "Para birimi",
      priceReferenceDate: "Fiyat referans tarihi",
      notes: "Notlar",
    },
    unbound: "Pakete bağlı değil",
    bind: "Bölge paketine bağla",
    bound: "Sürüm donduruldu",
  },

  /** Sihirbaz ekranları — süreç modeli bölüm 5. */
  wizard: {
    steps: {
      identity: "Proje kimliği",
      parcel: "Parsel ve tapu",
      zoning: "İmar durumu",
      soil: "Zemin ve saha",
      stakeholders: "Hak sahipleri",
    },
    tierGate: "Bu ekranın alanları seçili kademede görünmüyor.",
    tierHint: "Kademe yükseltildiğinde yeni alanlar açılır; girilmiş veriler korunur.",
    summary: "Yapılaşma özeti",
  },

  parcel: {
    title: "Parsel ve tapu",
    fields: {
      province: "İl",
      district: "İlçe",
      neighborhood: "Mahalle",
      block: "Ada",
      parcelNo: "Parsel no",
      sheetNo: "Pafta",
      area: "Parsel alanı (m²)",
      geometry: "Sınır poligonu",
      centerLatitude: "Merkez enlem",
      centerLongitude: "Merkez boylam",
      epsgCode: "Projeksiyon (EPSG)",
      rotation: "Dönüklük (derece)",
      ownershipType: "Mülkiyet tipi",
      ownerCount: "Malik sayısı",
      encumbrances: "Takyidat",
      hasExistingBuilding: "Mevcut yapı var",
      existingBuildingAge: "Mevcut yapı yaşı",
      existingBuildingFloors: "Mevcut yapı kat adedi",
      existingBuildingUnitCount: "Mevcut bağımsız bölüm sayısı",
      existingTotalArea: "Mevcut toplam alan (m²)",
      demolitionRequired: "Yıkım gerekiyor",
      structuralAssessmentStatus: "Yapı durum tespiti",
    },
  },

  zoning: {
    title: "İmar durumu",
    fields: {
      documentFile: "İmar durum belgesi",
      planNotes: "Plan notları",
      buildingOrder: "Yapı nizamı",
      groundCoverageRatio: "Taban alanı katsayısı (TAKS)",
      floorAreaRatio: "Emsal (KAKS)",
      farCalculationBasis: "Emsal hesap yöntemi",
      setbackFront: "Ön çekme mesafesi (m)",
      setbackSide: "Yan çekme mesafesi (m)",
      setbackRear: "Arka çekme mesafesi (m)",
      maxFloorCount: "Azami kat adedi",
      maxHeight: "Azami yükseklik (m)",
      heightReferenceRuleKey: "Yükseklik ölçüm referansı",
      roadFrontages: "Cephe aldığı yollar",
      referenceLevel: "Referans kot",
      cornerLevels: "Köşe kotları",
      levelDataSource: "Kot verisi kaynağı",
      specialConstraints: "Özel kısıtlar",
    },
    computed: {
      maxFootprint: "Azami taban alanı (m²)",
      maxTotalFloorArea: "Azami toplam inşaat alanı (m²)",
      buildableEnvelope: "Yapılaşabilir zarf",
      basementGainFromLevelDifference: "Kot farkından bodrum kazanımı (m²)",
      floorCount: "Kat adedi",
      effectiveMaxHeight: "Etkin azami yükseklik (m)",
      envelopeArea: "Zarf alanı (m²)",
      envelopeParts: "Zarf parça sayısı",
    },
    constraintChecklistEmpty:
      "Özel kısıt listesi boş — bölge paketi henüz doldurulmadı.",
    constraintValue: "Değer",
  },

  soil: {
    title: "Zemin ve saha",
    fields: {
      reportFile: "Zemin etüt raporu",
      soilClass: "Zemin sınıfı",
      bearingCapacity: "Zemin emniyet gerilmesi",
      groundwaterLevel: "Yeraltı su seviyesi (m)",
      liquefactionRisk: "Sıvılaşma riski",
      foundationType: "Temel sistemi",
      pileRequired: "Kazık gerekiyor",
      pileCount: "Kazık adedi",
      pileDepth: "Kazık derinliği (m)",
      pileDiameter: "Kazık çapı (m)",
      shoringRequired: "İksa gerekiyor",
      shoringMethod: "İksa yöntemi",
      shoringArea: "İksa yüzeyi (m²)",
      adjacentBuildingDistances: "Komşu binalara mesafe",
      topographyLevelDifference: "Kot farkı (m)",
      excavationHaulDistance: "Hafriyat çıkış mesafesi (km)",
      disposalSiteFee: "Döküm sahası bedeli",
      siteAccessRoadWidth: "Şantiye yolu genişliği (m)",
      craneFeasible: "Vinç kurulabilir",
      utilityConnections: "Altyapı bağlantıları",
      siteFencePerimeter: "Şantiye çiti çevresi (m)",
      fencedSides: "Çitli cephe sayısı",
    },
  },

  stakeholder: {
    title: "Hak sahipleri",
    empty: "Henüz hak sahibi girilmedi.",
    add: "Hak sahibi ekle",
    fields: {
      name: "Ad soyad",
      contactPhone: "Telefon",
      contactEmail: "E-posta",
      shareRatio: "Pay oranı",
      existingUnitArea: "Mevcut bağımsız bölüm alanı (m²)",
      expectationNotes: "Beklenti / talep notları",
      agreementStance: "Anlaşma eğilimi",
      housingAidEligible: "Barınma yardımı hak sahibi",
      housingAidMonths: "Barınma yardımı süresi (ay)",
      incentiveProgramEligible: "Teşvik programına uygun",
    },
    majority: {
      title: "Çoğunluk göstergesi",
      threshold: "Karar çoğunluğu eşiği",
      agreed: "Anlaşan pay oranı",
      distance: "Eşiğe uzaklık",
      reached: "Karar çoğunluğu sağlandı",
      notReached: "Karar çoğunluğu sağlanmadı",
      thresholdMissing: "Eşik bölge paketinde tanımlı değil — gösterge hesaplanamıyor.",
    },
  },

  // ============================== enum sözlükleri ==============================

  tier: {
    K1: "K1 — Ön eleme",
    K2: "K2 — Ön etüt",
    K3: "K3 — Detaylı etüt",
  },

  projectType: {
    yeniYapi: "Yeni yapı",
    kentselDonusum: "Kentsel dönüşüm",
    ilaveKat: "İlave kat",
    guclendirme: "Güçlendirme",
  },

  projectStatus: {
    taslak: "Taslak",
    onEleme: "Ön eleme",
    onEtut: "Ön etüt",
    detayliEtut: "Detaylı etüt",
    teklifVerildi: "Teklif verildi",
    sozlesme: "Sözleşme",
    iptal: "İptal",
  },

  ownershipType: {
    tekMalik: "Tek malik",
    hisseli: "Hisseli",
    katMulkiyeti: "Kat mülkiyeti",
    katIrtifaki: "Kat irtifakı",
  },

  structuralAssessmentStatus: {
    yapilmadi: "Yapılmadı",
    riskliYapi: "Riskli yapı",
    riskliDegil: "Riskli değil",
    itirazSurecinde: "İtiraz sürecinde",
  },

  buildingOrder: {
    ayrik: "Ayrık nizam",
    bitisik: "Bitişik nizam",
    blok: "Blok nizam",
    ikizNizam: "İkiz nizam",
  },

  farCalculationBasis: {
    brut: "Brüt alan üzerinden",
    net: "Net alan üzerinden",
  },

  levelDataSource: {
    resmiKroki: "Resmî kot krokisi",
    demServisi: "Sayısal yükseklik modeli",
    manuel: "Manuel giriş",
  },

  liquefactionRisk: {
    yok: "Yok",
    dusuk: "Düşük",
    orta: "Orta",
    yuksek: "Yüksek",
  },

  foundationType: {
    radye: "Radye temel",
    tekil: "Tekil temel",
    surekli: "Sürekli temel",
    kazikli: "Kazıklı temel",
  },

  agreementStance: {
    olumlu: "Olumlu",
    kararsiz: "Kararsız",
    itirazci: "İtirazcı",
  },

  offsetJoinType: {
    miter: "Kenar doğrularını kesiştir (miter)",
    round: "Sınıra dik uzaklık (round)",
  },

  regionPackage: {
    status: {
      draft: "Taslak",
      published: "Yayımlandı",
      deprecated: "Kullanımdan kaldırıldı",
    },
    emptyContent: "Kural içeriği boş — pilot bölge paketi henüz doldurulmadı.",
    testFixture: "TEST PAKETİ — gerçek mevzuat değildir.",
  },

  override: {
    marker: "Ezildi",
    reason: "Ezme gerekçesi",
    computed: "Hesaplanan",
    overridden: "Kullanıcının yazdığı",
  },

  // ============================== hata ve uyarı ==============================

  errors: {
    DATUM_NOT_FOUND: "Kayıt bulunamadı.",
    DATUM_SET_ONCE: "Dondurulmuş sürüm doğrudan değiştirilemez.",
    DATUM_NOT_PUBLISHED: "Yalnızca yayımlanmış bir sürüme bağlanılabilir.",
    DATUM_FROZEN: "Yayımlanmış bölge paketi sürümü değişmezdir.",
    DATUM_TENANT_SCOPE: "Kayıt bu organizasyonda bulunamadı.",
    DATUM_GENERATED_COLUMN: "Bu alan hesaplanır ve doğrudan yazılamaz.",
    DATUM_ALREADY_PUBLISHED: "Bu sürüm zaten yayımlanmış.",
    unknown: "Beklenmeyen bir hata oluştu.",
  },

  /**
   * UYARI MESAJLARI — ilke 7: engelleme, uyar.
   *
   * `{param}` yer tutucuları `warningMessage()` tarafından doldurulur.
   * Hata mesajlarından farklı olarak uyarılar SAYI taşır.
   */
  warnings: {
    PACKAGE_NOT_BOUND: "Proje bir bölge paketine bağlı değil — kural okunamıyor.",
    ZONING_RULE_SET_MISSING:
      "Bölge paketinde imar kural seti yok ({count} satır bulundu) — pilot paket henüz doldurulmadı.",
    OFFSET_JOIN_TYPE_MISSING:
      "Çekme ötelemesinin köşe davranışı bölge paketinde tanımlı değil; zarf hesaplanmadı.",
    CONSENT_RULE_MISSING:
      "Karar çoğunluğu eşiği bölge paketinde tanımlı değil — çoğunluk göstergesi hesaplanamıyor.",
    CONSTRAINT_CATALOG_EMPTY: "Özel kısıt listesi boş — bölge paketi henüz doldurulmadı.",

    PARCEL_AREA_MISSING: "Parsel alanı girilmedi.",
    PARCEL_GEOMETRY_MISSING:
      "Parsel poligonu girilmedi; yalnızca alan üzerinden hesap yapıldı, zarf üretilmedi.",
    GROUND_COVERAGE_RATIO_MISSING: "Taban alanı katsayısı (TAKS) girilmedi.",
    FLOOR_AREA_RATIO_MISSING: "Emsal (KAKS) girilmedi.",
    SETBACKS_MISSING: "Çekme mesafeleri girilmedi; zarf hesaplanamadı.",
    PARCEL_GEOMETRY_SELF_INTERSECTING:
      "Parsel sınırı kendini kesiyor; alan ve öteleme güvenilir değil.",
    EDGE_ROLE_DEFAULTED:
      "{edges}/{total} kenarın rolü belirtilmemiş; yan cephe varsayıldı.",
    CONSTRAINT_VALUE_MISSING:
      "“{ruleKey}” kısıtı işaretli ama değeri girilmemiş; hesaba katılmadı.",

    ENVELOPE_EXCEEDS_FOOTPRINT:
      "Zarf taban alanı sınırını aşıyor: {envelopeArea} m² > {maxFootprint} m². Küçültme yönünü siz seçmelisiniz.",
    ENVELOPE_VANISHED:
      "Çekme mesafeleri parselin tamamını kaplıyor; yapılaşabilir alan kalmadı ({parcelArea} m² parsel).",
    ENVELOPE_SPLIT: "Çekme mesafeleri zarfı {parts} ayrı parçaya böldü.",
    FAR_EXEMPTIONS_IGNORED:
      "Emsal harici alanlar hesaba katılmadı; program girildikten sonra netleşir.",
    FLOOR_COUNT_FROM_HEIGHT_UNAVAILABLE:
      "Yalnızca azami yükseklik ({maxHeight} m) girilmiş; kat yüksekliği olmadan kat adedi hesaplanamaz.",
    BASEMENT_GAIN_NOT_DEFINED:
      "Kot farkından bodrum kazanımı kuralı tanımlı değil; hesaplanmadı.",

    SHARES_DO_NOT_SUM: "Pay oranları toplamı %{total} — %100 etmiyor.",
    MAJORITY_NOT_REACHED:
      "Karar çoğunluğu sağlanmadı: %{agreed}, eşik %{threshold}.",
  } satisfies Record<WarningCode, string>,
} as const;

/** Hata kodundan Türkçe mesaj. Kod içine Türkçe gömmemenin yolu budur. */
export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = raw.split(":")[0]?.trim();
  if (code && code in tr.errors) {
    return tr.errors[code as keyof typeof tr.errors];
  }
  return tr.errors.unknown;
}

/**
 * Uyarı mesajı — parametreler `{ad}` yer tutucularına yerleştirilir.
 *
 * `errorMessage()` bunu yapamıyordu (kodu sabit metne çeviriyordu) ve
 * uyarılar sayı taşımak zorunda: "zarf 222 m² > 206,4 m²".
 */
export function warningMessage(warning: Warning): string {
  const template = tr.warnings[warning.code];
  if (!warning.params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = warning.params?.[key];
    return value === undefined ? match : formatNumber(value);
  });
}

function formatNumber(value: string | number): string {
  if (typeof value !== "number") return value;
  // Türkçe ondalık ayracı virgüldür.
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}
