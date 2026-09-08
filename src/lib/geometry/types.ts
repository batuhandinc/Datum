/**
 * GEOMETRİ MODÜLÜ — tipler.
 *
 * Bu modül SAF TypeScript'tir: Prisma, Next veya veritabanı bağımlılığı YOKTUR.
 * Aynı dosyadan hem sunucuda hem tarayıcıda çalışır (veri modeli bölüm 3).
 *
 * KOORDİNAT SÖZLEŞMESİ — yerel metrik:
 *   origin = parselin ağırlık merkezi · birim = metre
 *   eksen  = kaynak projeksiyonun grid ekseni
 *
 * Enlem/boylamda alan veya öteleme hesabı YAPILMAZ. GeoJSON'a benzeyen şekil
 * `crs: "local-metric"` ayracıyla işaretlenir; RFC 7946'nın WGS84 varsayımı
 * geçerli değildir ve bir haritalama kütüphanesine doğrudan beslenemez.
 */

/** Yerel metrik nokta: [x, y], metre. */
export type LocalPoint = readonly [number, number];

/**
 * Kapalı halka — ilk ve son nokta AYNIDIR (GeoJSON sözleşmesi).
 * `normalizeRing` bunu garanti eder; modül içi tüm fonksiyonlar kapalı varsayar.
 */
export type LocalRing = readonly LocalPoint[];

export const LOCAL_CRS = "local-metric" as const;

/** İlk halka dış sınır, kalanlar delik. */
export interface LocalPolygon {
  readonly crs: typeof LOCAL_CRS;
  readonly type: "Polygon";
  readonly coordinates: readonly LocalRing[];
}

/** İçe öteleme poligonu BÖLEBİLİR veya YOK EDEBİLİR — sonuç daima çoklu. */
export interface LocalMultiPolygon {
  readonly crs: typeof LOCAL_CRS;
  readonly type: "MultiPolygon";
  readonly coordinates: readonly (readonly LocalRing[])[];
}

/**
 * Kenarın çekme mesafesi rolü.
 * `ZoningData.setbackFront / setbackSide / setbackRear` üç AYRI değerdir;
 * hangi poligon kenarının hangi rolü taşıdığını `roadFrontages[].role` söyler.
 */
export type EdgeRole = "front" | "side" | "rear";

/**
 * İçbükey köşe davranışı. PAKETTEN gelir (`ZoningRuleSet.offsetJoinType`),
 * koda gömülü varsayılanı YOKTUR (ilke 1).
 *
 * Ölçüm — L parseli, tüm kenarlar içe:
 *   3 m çekme → miter 222,00 m² · round 223,93 m²
 *   5 m çekme → miter  66,00 m² · round  71,37 m²   (%8,1 fark)
 */
export type JoinType = "miter" | "round";

/** Bir kenarın indeksi ve ona uygulanacak çekme mesafesi (metre). */
export interface EdgeSetback {
  /** Dış halkadaki kenar indeksi: i. kenar = coordinates[0][i] → [i+1]. */
  readonly edgeIndex: number;
  readonly distance: number;
}

/** Geometri işlemleri asla sessizce yanlış sonuç vermez — uyarı döndürür. */
export interface GeometryWarning {
  readonly code: string;
  readonly params?: Readonly<Record<string, string | number>>;
}

export interface GeometryResult<T> {
  readonly value: T;
  readonly warnings: readonly GeometryWarning[];
}

// ------------------------------------------------------------------ kurucular

export function polygon(coordinates: readonly LocalRing[]): LocalPolygon {
  return { crs: LOCAL_CRS, type: "Polygon", coordinates };
}

export function multiPolygon(
  coordinates: readonly (readonly LocalRing[])[],
): LocalMultiPolygon {
  return { crs: LOCAL_CRS, type: "MultiPolygon", coordinates };
}

/** Boş sonuç — öteleme parseli tamamen yok ettiğinde. HATA DEĞİLDİR. */
export const EMPTY_MULTI_POLYGON: LocalMultiPolygon = multiPolygon([]);

export function isEmpty(mp: LocalMultiPolygon): boolean {
  return mp.coordinates.length === 0;
}
