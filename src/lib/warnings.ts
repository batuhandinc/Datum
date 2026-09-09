/**
 * UYARI ALTYAPISI — ilke 7: "Kısıt ihlali engellemez, uyarır."
 *
 * Bu, normal form doğrulamasının TERSİDİR. Bir uyarı kaydı engellemez,
 * hesabı durdurmaz; sonucun yanında taşınır ve raporda görünür.
 *
 * Neden ayrı bir tip: mevcut `errorMessage()` yalnızca kod → sabit metin
 * çeviriyor, PARAMETRE enterpole edemiyor. Ama uyarılar sayı taşımak
 * zorunda — "taban alanı aşıldı: 320 m² > 300 m²" gibi.
 *
 * Türkçe metin YOK: yalnızca kod ve parametre. Çeviri i18n katmanında.
 */

export interface Warning {
  readonly code: WarningCode;
  readonly params?: Readonly<Record<string, string | number>>;
}

/**
 * Tüm uyarı kodları. `as const` + union → i18n sözlüğünde eksik anahtar
 * DERLEME hatası olur, çalışma zamanında sessiz `undefined` değil.
 */
export const WARNING_CODES = [
  // --- bölge paketi / kural motoru ---
  /** Proje bir bölge paketi sürümüne bağlı değil; hiçbir kural okunamaz. */
  "PACKAGE_NOT_BOUND",
  /** Paket bağlı ama gereken kural satırı yok (pilot paket Faz 0'da doldurulacak). */
  "ZONING_RULE_SET_MISSING",
  /** Öteleme köşe davranışı pakette tanımlı değil → zarf HESAPLANMAZ (ilke 1). */
  "OFFSET_JOIN_TYPE_MISSING",
  /** Karar çoğunluğu eşiği pakette yok → çoğunluk göstergesi hesaplanamaz. */
  "CONSENT_RULE_MISSING",
  /** Özel kısıt kontrol listesi boş; paket henüz doldurulmamış. */
  "CONSTRAINT_CATALOG_EMPTY",

  // --- L0 girdileri ---
  "PARCEL_AREA_MISSING",
  /** K1'de poligon yok (geometry K2). Skaler hesap yapılır, zarf üretilmez. */
  "PARCEL_GEOMETRY_MISSING",
  "GROUND_COVERAGE_RATIO_MISSING",
  "FLOOR_AREA_RATIO_MISSING",
  "SETBACKS_MISSING",
  /** Parsel sınırı kendini kesiyor — alan anlamsız, öteleme güvenilmez. */
  "PARCEL_GEOMETRY_SELF_INTERSECTING",
  /** roadFrontages bir kenara rol vermemiş; "side" varsayıldı. */
  "EDGE_ROLE_DEFAULTED",
  /**
   * Kısıt işaretli ve kataloğa göre bir etkisi var, ama DEĞERİ girilmemiş.
   * Sessizce atlamak iyimser hata olurdu: zarf olduğundan büyük çıkardı.
   */
  "CONSTRAINT_VALUE_MISSING",

  // --- L0 sonuçları ---
  /** Ötelenmiş poligon taban alanı katsayısını aşıyor — küçültme yönü KULLANICIYA sorulur. */
  "ENVELOPE_EXCEEDS_FOOTPRINT",
  /** Çekme mesafeleri parseli tamamen yok etti. Hata değil, geçerli sonuç. */
  "ENVELOPE_VANISHED",
  /** Öteleme poligonu böldü — zarf birden çok parça. */
  "ENVELOPE_SPLIT",
  /** Emsal harici alanlar hesaba katılmadı (A5/İP-3 gerektirir). */
  "FAR_EXEMPTIONS_IGNORED",
  /** Yalnızca maxHeight var; kat yüksekliği A5'te (İP-3) → kat adedi hesaplanmadı. */
  "FLOOR_COUNT_FROM_HEIGHT_UNAVAILABLE",
  /** Bodrum kazanım kuralı hiçbir dokümanda tanımlı değil (İP-3). */
  "BASEMENT_GAIN_NOT_DEFINED",

  // --- A4 hak sahipleri ---
  /** Pay oranları toplamı %100 etmiyor. */
  "SHARES_DO_NOT_SUM",
  /** Karar çoğunluğu eşiğine ulaşılmadı. */
  "MAJORITY_NOT_REACHED",

  // --- İP-3 kural tabloları ---
  // Hepsi aynı sözleşme: kural yoksa hesaplama YAPILMAZ, koda gömülü
  // varsayılan konmaz (ilke 1). `{count}` kaç satır bulunduğunu söyler —
  // 0 "paket boş", >1 "hangisi seçilecek doküman tanımlamıyor" demektir.
  /** Otopark kuralı yok veya birden çok. */
  "PARKING_RULE_MISSING",
  /** Çekirdek kuralı yok veya birden çok — çekirdek yerleştirilemez. */
  "CORE_RULE_MISSING",
  /** Yangın güvenliği kuralı yok veya birden çok. */
  "FIRE_SAFETY_RULE_MISSING",
  /** Tesisat katsayıları yok veya birden çok. */
  "UTILITY_COEFFICIENTS_MISSING",
  /** Zorunlu mekan kuralı hiç yok — servis mekanı listesi boş açılır. */
  "REQUIRED_SPACE_RULES_EMPTY",
  /** Araç başına alan katsayısı tanımsız — otopark sayımı yapılamaz. */
  "PARKING_AREA_PER_SPACE_MISSING",

  // --- L1 çekirdek yerleşimi (İP-3) ---
  /** Asansör zorunluluk eşiği sağlandı ama minimum adet tanımsız. */
  "CORE_ELEVATOR_COUNT_UNAVAILABLE",
  /** Zarf yok veya alanı sıfır — çekirdek yerleştirilecek plaka yok. */
  "CORE_PLATE_MISSING",
  /** Zarf bölünmüş; çekirdek EN BÜYÜK parçaya yerleşti. */
  "CORE_ENVELOPE_SPLIT",
  /** Merdiven/sirkülasyon/kabin ölçüleri eksik — çekirdek boyutlandırılamadı. */
  "CORE_DIMENSIONS_UNAVAILABLE",
  /** Önerilen çekirdek zarfa sığmadı — engellenmez, kullanıcı taşır (ilke 7). */
  "CORE_OUTSIDE_ENVELOPE",
  /** Kaçış mesafesi paket sınırını aştı. */
  "CORE_ESCAPE_DISTANCE_EXCEEDED",

  // --- servis mekanı motoru (İP-3) ---
  /** Paketten tanınmayan bir tetikleyici geldi — zorunluluk hesaplanamadı. */
  "SERVICE_TRIGGER_UNKNOWN",
  /** Tetikleyicinin okuduğu ölçü henüz yok (ör. talep gücü katsayısı eksik). */
  "SERVICE_DRIVER_MISSING",
  /** Alan formülü geçersiz — yayım kapısını atlamış bir pakette olabilir. */
  "SERVICE_AREA_FORMULA_INVALID",

  // --- otopark çözücü ve rampa (İP-3) ---
  /** İhtiyaç formülü geçersiz. */
  "PARKING_FORMULA_INVALID",
  /** Bodrum kat alanı bilinmiyor — zarf henüz hesaplanmamış. */
  "PARKING_BASEMENT_AREA_MISSING",
  /** Servis mekanı alanı bilinmiyor; 0 saymak havuzu şişirirdi. */
  "PARKING_SERVICE_AREA_UNKNOWN",
  /** Rampa ayak izi bilinmiyor; aynı gerekçeyle 0 sayılmıyor. */
  "PARKING_RAMP_AREA_UNKNOWN",
  /** Hiçbir bodrum sayısında kullanılabilir alan kalmadı. */
  "PARKING_NO_SCENARIO",
  /** Korkuluğa çarpıldı: ihtiyaç hiçbir senaryoda karşılanmadı. */
  "PARKING_LIMIT_REACHED",
  /** Rampa eğim sınırı paket tarafından verilmemiş. */
  "RAMP_SLOPE_MISSING",
  /** Bodrum derinliği bilinmiyor — rampa boyu hesaplanamadı. */
  "RAMP_DEPTH_MISSING",
  /** Rampa genişliği yok — ayak izi hesaplanamadı. */
  "RAMP_WIDTH_MISSING",

  // --- formül motoru (İP-3) ---
  // SÖZDİZİMİ hataları burada YOKTUR: onlar yayım anında yakalanır ve yayımı
  // reddeder. Buradakiler yalnızca ÇALIŞMA ZAMANI sorunlarıdır.
  /** Formülün okuduğu bir ölçü henüz girilmemiş. */
  "FORMULA_INPUT_MISSING",
  /** Sıfıra bölme — sonuç hesaplanmadı (Infinity yayılmasın diye). */
  "FORMULA_DIVISION_BY_ZERO",
  /** Sonuç sözleşmenin alt sınırının altına düştü. */
  "FORMULA_RESULT_BELOW_MINIMUM",

  // --- plan motorunun kural tabloları (İP-4) ---
  /** Birim ölçeğinde bölümleme kuralı yok — L2 hesaplayamaz. */
  "UNIT_LAYOUT_RULE_MISSING",
  /** Yapı elemanı kuralı yok — duvar, açıklık ve aks üretilemez. */
  "BUILDING_ELEMENT_RULE_MISSING",

  // --- L2 bölümleme (İP-4) ---
  /**
   * Brüt/net katsayısı paketten gelmiyor.
   *
   * Hedef NET (mekan alanları toplamı), plaka BRÜT. Katsayı `plaka ÷ Σhedef`
   * ile UYDURULAMAZ: bu, programın plakayı tam doldurduğunu VARSAYMAK olur ve
   * program plakanın %60'ıysa bütün daireleri sessizce %66 şişirir.
   */
  "L2_GROSS_TO_NET_MISSING",
  /** Birimin hedef alanı bilinmiyor; 0 saymak diğerlerinin payını şişirirdi. */
  "L2_UNIT_TARGET_UNKNOWN",
  /** Birime poligon düşmedi — program plakaya sığmadı. */
  "L2_UNIT_UNPLACED",
  /** Birim ne çekirdeğe ne sirkülasyona değiyor. KURALSIZ bilinen olgu. */
  "L2_UNIT_NO_CORE_ACCESS",
  /** Birim hiçbir cepheye değmiyor — penceresiz daire. KURALSIZ bilinen olgu. */
  "L2_UNIT_NO_FACADE",
  /** Cephe teması paket asgarisinin altında. */
  "L2_UNIT_FACADE_SHORT",
  /** Gerçekleşen alan hedeften tolerans dışı saptı. */
  "L2_UNIT_AREA_OFF_TARGET",
  /** Birim en-boy oranı paket sınırını aştı — aşırı uzun dar birim. */
  "L2_UNIT_ASPECT_RATIO",
  /** Birim poligonu AYRIK parçalara bölündü; erişilebilen parça alındı. */
  "L2_UNIT_SPLIT",
  /** Hiçbir birime verilemeyen artık alan kaldı. */
  "L2_RESIDUAL_AREA",
  /** Program plakadan büyük — kuyruktaki birimler yerleşemedi. */
  "L2_PROGRAM_EXCEEDS_PLATE",

  // --- manuel bölümleme (İP-4) ---
  /** Kesme çizgisi en az iki nokta ister. */
  "PLAN_CUT_INVALID",
  /**
   * Kesme çizgisi çekirdeğin veya sirkülasyonun üzerinden geçiyor.
   *
   * Engellemez: çekirdek ve sirkülasyon plakadan ZATEN düşülmüştür, dolayısıyla
   * çizginin orada bir etkisi olmaz. Uyarı, kullanıcının "neden bölünmedi"
   * diye sormasını engellemek içindir.
   */
  "PLAN_CUT_CROSSES_CORE",
  /** Hiç kesme çizilmemiş — plaka tek parça. */
  "PLAN_NO_CUTS",
  /** Kesmelerden çıkan parçalardan bazıları hiçbir bağımsız bölüme atanmadı. */
  "PLAN_PIECE_UNASSIGNED",
  /** Parça sayısı birim sayısıyla uyuşmuyor. */
  "PLAN_PIECE_COUNT_MISMATCH",
  /** Plaka henüz hesaplanmadı — L0 çalışmamış veya zarf üretilememiş. */
  "PLAN_PLATE_MISSING",
  /** Çekirdek yerleşmemiş — erişim kontrolü yapılamaz. */
  "PLAN_CORE_MISSING",
] as const;

export type WarningCode = (typeof WARNING_CODES)[number];

export function warn(
  code: WarningCode,
  params?: Record<string, string | number>,
): Warning {
  return params ? { code, params } : { code };
}

/** Uyarı toplayıcı — hesap fonksiyonları boyunca taşınır. */
export class WarningCollector {
  private readonly items: Warning[] = [];

  add(code: WarningCode, params?: Record<string, string | number>): void {
    this.items.push(warn(code, params));
  }

  /** Aynı kod birden çok kez eklenmişse yalnızca ilki tutulur. */
  addOnce(code: WarningCode, params?: Record<string, string | number>): void {
    if (!this.items.some((w) => w.code === code)) this.add(code, params);
  }

  merge(warnings: readonly Warning[]): void {
    this.items.push(...warnings);
  }

  get all(): readonly Warning[] {
    return this.items;
  }

  has(code: WarningCode): boolean {
    return this.items.some((w) => w.code === code);
  }
}
