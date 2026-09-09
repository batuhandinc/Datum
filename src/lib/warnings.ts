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

  // --- formül motoru (İP-3) ---
  // SÖZDİZİMİ hataları burada YOKTUR: onlar yayım anında yakalanır ve yayımı
  // reddeder. Buradakiler yalnızca ÇALIŞMA ZAMANI sorunlarıdır.
  /** Formülün okuduğu bir ölçü henüz girilmemiş. */
  "FORMULA_INPUT_MISSING",
  /** Sıfıra bölme — sonuç hesaplanmadı (Infinity yayılmasın diye). */
  "FORMULA_DIVISION_BY_ZERO",
  /** Sonuç sözleşmenin alt sınırının altına düştü. */
  "FORMULA_RESULT_BELOW_MINIMUM",
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
