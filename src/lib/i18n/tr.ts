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

  /** A5 program tanımı — İP-3. */
  program: {
    title: "Program ve kütle (A5)",
    open: "Programı aç",
    back: "Sihirbaza dön",
    floors: {
      title: "Katlar",
      empty: "Henüz kat girilmedi.",
      add: "Kat ekle",
      floorNo: "Kat no",
      floorNoHint: "Bodrum için negatif",
      floorType: "Kat tipi",
      grossHeight: "Brüt yükseklik (m)",
      hasCommercial: "Zemin katta ticari",
      unitCount: "Birim",
      locked: "Kilitli",
      lockedTo: "Şablon",
      lock: "Kilitle",
      unlock: "Kilidi aç",
      lockHint: "Kilitli kat şablona referans verir; kilit açılınca bağımsızlaşır ve önceki veriler korunur.",
      delete: "Sil",
    },
    unitTypes: {
      title: "Tipolojiler",
      empty: "Henüz tipoloji tanımlanmadı.",
      code: "Tipoloji kodu",
      codeHint: "Örnek: 3+1 A",
      spaces: "Mekanlar",
      spacesHint: "Her satır: mekanTipi alan — örnek “salon 33.5”",
      totalArea: "Toplam hedef alan",
      save: "Tipolojiyi kaydet",
      instantiate: "Örnekle",
      instantiateCount: "Adet",
      targetFloor: "Kat",
    },
    divergence: {
      title: "Şablondan ayrışan birimler",
      none: "Hiçbir birim şablonundan ayrışmıyor.",
      unit: "Birim",
      template: "Şablon",
      actual: "Gerçekleşen",
      difference: "Fark",
      note: "Ayrışma hata değildir; yalnızca görünür olmalıdır.",
    },
    mix: {
      title: "Birim karması",
      note: "Karmayı kullanıcı belirler; sistem önermez.",
      total: "Toplam bağımsız bölüm",
    },
  },

  /** Proje başlangıç sihirbazı — 8 soru. */
  startup: {
    title: "Proje başlangıcı (8 soru)",
    note: "Kural katmanı cevapları ön-doldurur; değiştirebilirsiniz.",
    save: "Cevapları kaydet",
    source: {
      prefilled: "Paketten",
      userOverride: "Değiştirildi",
      empty: "Boş",
    },
    noPackageSource: "Bu soru için bölge paketinde ön-dolum kaynağı yok.",
    questions: {
      targetParkingCount: "Hedeflenen otopark yeri sayısı",
      heatingSystemType: "Isıtma sistemi",
      hasCommercialGroundFloor: "Zemin katta ticari kullanım var mı",
      hasUnitStorages: "Bağımsız bölüm depoları yapılacak mı",
      elevatorCount: "Asansör sayısı",
      roofType: "Çatı tipi",
      generatorScope: "Yedek güç kapsamı",
      specificationLevel: "Kalite / donanım seviyesi",
    },
    unsupported: "Bu cevabın saklanacağı alan veri modelinde henüz tanımlı değil.",
  },

  /** L1 çekirdek, servis mekanları, otopark — İP-3 sonuç panelleri. */
  core: {
    title: "Çekirdek (L1)",
    strategy: "Yerleşim stratejisi",
    area: "Çekirdek alanı (m²)",
    requiredElevatorCount: "Gereken asansör adedi",
    escapeDistance: "En uzak nokta mesafesi (m)",
    notPlaced: "Çekirdek henüz yerleştirilmedi.",
    recompute: "Çekirdeği yeniden hesapla",
    shafts: "Şaftlar",
    shaftOffset: "Çekirdeğe göreli konum",
    continuityNote:
      "Şaft konumları çekirdeğe görelidir; çekirdek taşınınca tüm katlarda birlikte taşınır.",
  },

  coreStrategy: {
    merkezi: "Merkezî",
    kenar: "Kenar",
    cift: "Çift çekirdek",
  },

  floorType: {
    bodrum: "Bodrum",
    zemin: "Zemin",
    normal: "Normal kat",
    cekmeKat: "Çekme kat",
    catiArasi: "Çatı arası",
  },

  usageType: {
    konut: "Konut",
    ticari: "Ticari",
    ofis: "Ofis",
    depo: "Depo",
  },

  heatingSystemType: {
    merkezi: "Merkezî",
    bireysel: "Bireysel",
    bolgesel: "Bölgesel",
  },

  generatorScope: {
    yok: "Yok",
    ortakAlan: "Yalnızca ortak alan",
    tamYedekleme: "Tam yedekleme",
  },

  roofType: {
    kirma: "Kırma çatı",
    duz: "Düz çatı",
    teras: "Teras çatı",
    celikKarkas: "Çelik karkas",
  },

  specificationLevel: {
    ekonomik: "Ekonomik",
    standart: "Standart",
    ustSegment: "Üst segment",
    luks: "Lüks",
  },

  serviceSpaceType: {
    shelter: "Sığınak",
    electricalRoom: "Elektrik odası / trafo",
    waterTank: "Su deposu ve hidrofor",
    fireSystem: "Yangın sistemi",
    generator: "Jeneratör",
    heatingCenter: "Isı merkezi",
    janitorApartment: "Görevli dairesi",
    wasteRoom: "Çöp odası",
    bicycleParking: "Bisiklet park alanı",
    cleaningRoom: "Temizlik odası",
    managementOffice: "Yönetim odası",
    socialArea: "Sosyal alan",
  },

  shaftType: {
    tesisat: "Tesisat",
    havalandirma: "Havalandırma",
    cop: "Çöp",
    asansor: "Asansör",
    duman: "Duman tahliye",
  },

  /** İP-4 — duvar tipi mekan ilişkisinden TÜRER, kullanıcı seçmez. */
  wallType: {
    dis: "Dış duvar",
    ic: "İç duvar",
    islakHacim: "Islak hacim duvarı",
    saft: "Şaft duvarı",
    birimAyirici: "Birim ayırıcı",
  },

  serviceSpace: {
    title: "Servis mekanları",
    empty: "Bölge paketinde zorunlu mekan kuralı yok.",
    mandatory: "Zorunlu",
    optional: "Tercihe bağlı",
    undetermined: "Belirlenemedi",
    requiredArea: "Asgari alan (m²)",
    driver: "Ölçü",
    threshold: "Eşik",
    total: "Zorunlu alan toplamı (m²)",
  },

  /** İP-4 — plan motoru ekranı. */
  plan: {
    title: "Kat planı",
    link: "Kat planı →",
    intro:
      "Çekirdek ve sirkülasyon plakadan düşüldü. Kalan alanda kesme çizgileri çizerek " +
      "bağımsız bölüm sınırlarını belirleyin.",
    manualTitle: "Manuel bölümleme",
    autoTitle: "Otomatik bölümleme (L2)",
    runAuto: "Otomatik bölümle",
    autoHint:
      "L2 birimleri KENDİ hedeflerine keser; program plakayı doldurmuyorsa fark artık " +
      "olarak kalır, aşıyorsa kuyruktaki birimler yerleşmez. Sonuç hesaplanan değere " +
      "yazılır; manuel çiziminiz varsa o geçerli kalmaya devam eder.",
    floor: "Kat",
    noFloors: "Henüz kat tanımlanmadı — önce program ekranından kat ekleyin.",
    noProgramFloors:
      "Programı girilmemiş katlar bölümleme ekranında gösterilmiyor: {floors}. " +
      "Bağımsız bölümleri program ekranından ekleyin.",
    noPlate: "Kat plakası hesaplanmadı. İmar verisi girilince zarf çıkar.",
    noCore: "Çekirdek yerleşmedi. Bölge paketinde çekirdek kuralı gerekiyor.",
    plateArea: "Plaka",
    coreArea: "Çekirdek",
    remainderArea: "Kalan alan",
    residualArea: "Artık",
    coverage: "Kaplama",

    canvasHint:
      "Tuvale tıklayarak kesme çizgisinin noktalarını koyun; “Kesmeyi bitir” ile " +
      "çizgiyi tamamlayın. Çizgi çekirdeği kesemez — çekirdek zaten düşülmüştür.",
    finishCut: "Kesmeyi bitir",
    undoPoint: "Son noktayı sil",
    removeLastCut: "Son kesmeyi sil",
    clearCuts: "Kesmeleri temizle",
    cutCount: "kesme",
    pieceCount: "parça",
    lostArea: "Bıçak kaybı",

    assignTitle: "Parça → bağımsız bölüm eşleşmesi",
    piece: "Parça",
    unassigned: "— atanmadı —",
    apply: "Bölümlemeyi uygula",
    clearManual: "Manuel bölümlemeyi kaldır",

    diagnosticsTitle: "Bağımsız bölüm tanıları",
    unit: "Bağımsız bölüm",
    target: "Hedef (net)",
    grossTarget: "Hedef (brüt)",
    achieved: "Gerçekleşen",
    source: "Kaynak",
    sourceManual: "manuel",
    sourceAuto: "otomatik",
    notPlaced: "yerleşmedi",

    constraint: {
      coreAccess: "Çekirdek erişimi",
      facade: "Cephe",
      facadeLength: "Cephe uzunluğu",
      areaTolerance: "Alan toleransı",
      aspectRatio: "En-boy oranı",
    },
    state: {
      saglandi: "sağlandı",
      ihlal: "ihlal",
      degerlendirilemedi: "değerlendirilemedi",
    },
    stateHint:
      "“Değerlendirilemedi”, kısıtın sağlandığı anlamına GELMEZ: ya ölçüm yapılamadı " +
      "ya da bölge paketinde eşik tanımlı değil.",
  },

  parking: {
    title: "Otopark senaryoları",
    empty: "Senaryo üretilemedi.",
    note: "Sistem senaryo üretir, karar vermez. Seçim sizindir.",
    basementFloorCount: "Bodrum kat",
    plannedCount: "Sığan araç",
    requiredCount: "Yönetmelik ihtiyacı",
    deficitCount: "Eksik",
    usableArea: "Kullanılabilir alan (m²)",
    meets: "İhtiyacı karşılıyor",
    deficitRisk: "İzin riski",
    choose: "Bu senaryoyu seç",
    chosen: "Seçildi",
    acceptedDeficit: "Kabul edilen eksik",
    reason: "Seçim gerekçesi",
    ramp: "Rampa",
    rampLength: "Rampa uzunluğu (m)",
    rampFootprint: "Rampa ayak izi (m²)",
    rampWidth: "Rampa genişliği (m)",
    rampSave: "Rampayı kaydet",
    rampHint:
      "Uzunluk bodrum derinliğinden ve paketin eğim sınırından türer; genişlik girilmeden ayak izi hesaplanamaz ve otopark senaryoları üretilemez.",
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
    DATUM_FLOOR_INCOMPLETE: "Kat no ve kat tipi zorunludur.",
    DATUM_UNIT_TYPE_CODE_REQUIRED: "Tipoloji kodu zorunludur.",
    DATUM_INSTANCE_COUNT_INVALID: "Adet sıfırdan büyük olmalıdır.",
    DATUM_SCENARIO_INVALID: "Senaryo okunamadı.",
    DATUM_SPACE_LINE_INVALID: "Mekan satırı okunamadı — biçim: “mekanTipi alan”.",
    DATUM_UNKNOWN_SPACE_TYPE: "Tanınmayan mekan tipi.",
    DATUM_TEMPLATE_REQUIRED: "Kilitli kat bir şablona referans vermelidir.",
    DATUM_TEMPLATE_SELF: "Bir kat kendi şablonu olamaz.",
    DATUM_TEMPLATE_CHAIN: "Şablon olarak kilitli bir kat seçilemez.",
    DATUM_INVALID_FORMULA:
      "Bölge paketinde geçersiz bir kural formülü var; sürüm yayımlanamadı.",
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

    PARKING_RULE_MISSING:
      "Bölge paketinde otopark kuralı yok ({count} satır bulundu) — otopark hesaplanmadı.",
    CORE_RULE_MISSING:
      "Bölge paketinde çekirdek kuralı yok ({count} satır bulundu) — çekirdek yerleştirilmedi.",
    FIRE_SAFETY_RULE_MISSING:
      "Bölge paketinde yangın güvenliği kuralı yok ({count} satır bulundu).",
    UTILITY_COEFFICIENTS_MISSING:
      "Bölge paketinde tesisat katsayıları yok ({count} satır bulundu) — servis mekanı alanları hesaplanmadı.",
    REQUIRED_SPACE_RULES_EMPTY:
      "Bölge paketinde zorunlu servis mekanı kuralı yok — liste boş açıldı.",
    PARKING_AREA_PER_SPACE_MISSING:
      "Araç başına alan katsayısı tanımlı değil — kaç araç sığdığı hesaplanmadı.",

    CORE_ELEVATOR_COUNT_UNAVAILABLE:
      "Asansör zorunlu ama bölge paketinde asgari adet tanımlı değil — çekirdek boyutlandırılamadı.",
    CORE_PLATE_MISSING:
      "Yapılaşabilir zarf yok — çekirdek yerleştirilemedi.",
    CORE_ENVELOPE_SPLIT:
      "Zarf {parts} parçaya bölünmüş; çekirdek en büyük parçaya yerleştirildi.",
    CORE_DIMENSIONS_UNAVAILABLE:
      "Merdiven, sirkülasyon veya kabin ölçüleri eksik — çekirdek boyutlandırılamadı.",
    CORE_OUTSIDE_ENVELOPE:
      "Önerilen çekirdek zarfa sığmıyor — konumu veya ölçüsünü değiştirin.",
    CORE_ESCAPE_DISTANCE_EXCEEDED:
      "Kaçış mesafesi {distance} m; sınır {limit} m.",

    SERVICE_TRIGGER_UNKNOWN:
      "“{ruleKey}” kuralının tetikleyicisi tanınmıyor ({triggerType}) — zorunluluk belirlenemedi.",
    SERVICE_DRIVER_MISSING:
      "“{ruleKey}” kuralı {triggerType} değerini okuyor ama bu ölçü henüz yok.",
    SERVICE_AREA_FORMULA_INVALID:
      "“{ruleKey}” kuralının alan formülü geçersiz ({code}) — alan hesaplanmadı.",

    PARKING_FORMULA_INVALID:
      "Otopark ihtiyaç formülü geçersiz ({code}) — ihtiyaç hesaplanmadı.",
    PARKING_BASEMENT_AREA_MISSING:
      "Bodrum kat alanı bilinmiyor — otopark senaryoları üretilemedi.",
    PARKING_SERVICE_AREA_UNKNOWN:
      "Zorunlu servis mekanlarının alanı bilinmiyor — otopark senaryoları üretilemedi.",
    PARKING_RAMP_AREA_UNKNOWN:
      "Rampa ayak izi bilinmiyor — otopark senaryoları üretilemedi.",
    PARKING_NO_SCENARIO:
      "Servis mekanları ve rampa düşüldükten sonra otoparka alan kalmıyor.",
    PARKING_LIMIT_REACHED:
      "{floors} bodrum katına kadar denendi; otopark ihtiyacı hiçbir senaryoda karşılanmadı.",
    RAMP_SLOPE_MISSING:
      "Bölge paketinde rampa eğim sınırı yok — rampa boyu hesaplanmadı.",
    RAMP_DEPTH_MISSING:
      "Bodrum derinliği bilinmiyor — rampa boyu hesaplanmadı.",
    RAMP_WIDTH_MISSING:
      "Rampa genişliği girilmedi — rampa ayak izi hesaplanmadı.",

    FORMULA_INPUT_MISSING:
      "Kural formülü “{variable}” değerini okuyor ama bu ölçü henüz girilmedi — hesaplanmadı.",
    FORMULA_DIVISION_BY_ZERO:
      "Kural formülünde sıfıra bölme oluştu — sonuç hesaplanmadı.",
    FORMULA_RESULT_BELOW_MINIMUM:
      "Kural formülü {value} üretti; en az {minimum} olmalıydı — sonuç kullanılmadı.",

    // --- plan motorunun kural tabloları (İP-4) ---
    UNIT_LAYOUT_RULE_MISSING:
      "Bölge paketinde birim bölümleme kuralı yok ({count} satır) — kat plakası bölümlenmedi.",
    BUILDING_ELEMENT_RULE_MISSING:
      "Bölge paketinde yapı elemanı kuralı yok ({count} satır) — duvar, açıklık ve kolon aksı üretilmedi.",

    // --- L2 bölümleme (İP-4) ---
    L2_GROSS_TO_NET_MISSING:
      "Brüt/net katsayısı pakette tanımlı değil — bölümleme yapılmadı. " +
      "Hedefler net mekan alanı, plaka ise brüttür; katsayı bölmeyle türetilseydi " +
      "program plakayı doldurmadığında bütün daireler sessizce şişerdi.",
    L2_UNIT_TARGET_UNKNOWN:
      "{unitNo} nolu bağımsız bölümün hedef alanı bilinmiyor — yerleştirilmedi. " +
      "Sıfır sayılsaydı diğer birimlerin payı orantısız büyürdü.",
    L2_UNIT_UNPLACED: "{unitNo} nolu bağımsız bölüme plakada yer kalmadı.",
    L2_UNIT_NO_CORE_ACCESS:
      "{unitNo} nolu bağımsız bölüm ne çekirdeğe ne sirkülasyona değiyor — kapısı yok.",
    L2_UNIT_NO_FACADE: "{unitNo} nolu bağımsız bölüm hiçbir cepheye değmiyor — penceresiz.",
    L2_UNIT_FACADE_SHORT:
      "{unitNo} nolu bağımsız bölümün cephesi {measured} m; paket en az {limit} m istiyor.",
    L2_UNIT_AREA_OFF_TARGET:
      "{unitNo} nolu bağımsız bölüm {achieved} m² çıktı; hedef {target} m² (%{deviation} sapma).",
    L2_UNIT_ASPECT_RATIO:
      "{unitNo} nolu bağımsız bölümün en-boy oranı {measured}; paket sınırı {limit}.",
    L2_UNIT_SPLIT:
      "{unitNo} nolu bağımsız bölüm ayrık parçalara bölündü; erişilebilen parça alındı, " +
      "{discarded} m² artığa aktarıldı.",
    L2_RESIDUAL_AREA: "{area} m² hiçbir bağımsız bölüme verilemedi.",
    L2_PROGRAM_EXCEEDS_PLATE:
      "Program plakadan {shortfall} m² büyük — {count} bağımsız bölüm yerleşemedi.",

    // --- manuel bölümleme (İP-4) ---
    PLAN_CUT_INVALID: "Kesme çizgisi en az iki nokta gerektirir — {count} nokta verildi.",
    PLAN_CUT_CROSSES_CORE:
      "Kesme çizgisi çekirdeğin veya sirkülasyonun üzerinden geçiyor; oralarda etkisi yok. " +
      "Çekirdek ve sirkülasyon plakadan zaten düşülmüştür.",
    PLAN_NO_CUTS: "Henüz kesme çizilmedi — kalan alan tek parça.",
    PLAN_PIECE_UNASSIGNED: "{count} parça hiçbir bağımsız bölüme atanmadı.",
    PLAN_PIECE_COUNT_MISMATCH:
      "{pieces} parça çıktı ama {units} bağımsız bölüm var — eşleşme elle yapılmalı.",
    PLAN_PLATE_MISSING: "Kat plakası yok — önce imar verisinden zarf hesaplanmalı.",
    PLAN_CORE_MISSING: "Çekirdek yerleşmedi — erişim kontrolü yapılamadı.",
    L2_DOUBLE_CORE_UNSUPPORTED:
      "Çift çekirdek stratejisi henüz uygulanamıyor (şemada blok başına tek çekirdek var) — " +
      "bölümleme yapılmadı. Tek çekirdek gibi davranmak, tanımsız bir durumu uydurmak olurdu.",
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
