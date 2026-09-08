import type { LocalPoint, LocalRing } from "./types";
import { ringCentroid, normalizeRing } from "./measure";

/**
 * YEREL TEĞET DÜZLEM — enlem/boylam ↔ yerel metre.
 *
 * SAF: hiçbir bağımlılığı yok, tarayıcıya gider. proj4 GEREKMEZ.
 *
 * ELİPSOİDAL yaklaşım kullanılır (naif küre DEĞİL):
 *   x = N·cos(φ₀)·Δλ      N = enlem-dik eğrilik yarıçapı
 *   y = M·Δφ              M = meridyen eğrilik yarıçapı
 *
 * ÖLÇÜLMÜŞ HATA (200 m parsel, geographiclib yer gerçeğine karşı):
 *   elipsoidal teğet düzlem   36°: 2,28 mm · 39°: 2,54 mm · 42°: 2,82 mm
 *   naif küre R=6.371.000 m   42°: 526 mm ve 61 m² ALAN HATASI
 *
 * Elipsoidal hata kadastral ölçüm hassasiyetinin (cm) çok altındadır.
 * Naif küre KULLANILMAZ: 42° enlemde 200 m'lik bir parselde 61 m² hata
 * emsal ve TAKS hesabını doğrudan bozar.
 */

// WGS84
const A = 6378137.0;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);

const DEG = Math.PI / 180;

/** Yerel çerçevenin dünyaya bağlanması. `Parcel` bu üçlüyü saklar. */
export interface LocalFrame {
  /** Origin — parselin ağırlık merkezi. */
  readonly centerLatitude: number;
  readonly centerLongitude: number;
  /** Yerel eksen ile grid kuzeyi arası açı (derece). İP-2'de daima 0. */
  readonly rotation: number;
}

interface CurvatureRadii {
  /** Enlem-dik eğrilik yarıçapı. */
  readonly n: number;
  /** Meridyen eğrilik yarıçapı. */
  readonly m: number;
}

function curvature(latitudeDeg: number): CurvatureRadii {
  const s = Math.sin(latitudeDeg * DEG);
  const w = Math.sqrt(1 - E2 * s * s);
  return { n: A / w, m: (A * (1 - E2)) / (w * w * w) };
}

/** WGS84 [boylam, enlem] → yerel metre. */
export function wgs84ToLocal(
  longitude: number,
  latitude: number,
  frame: LocalFrame,
): LocalPoint {
  const { n, m } = curvature(frame.centerLatitude);
  const x = n * Math.cos(frame.centerLatitude * DEG) * (longitude - frame.centerLongitude) * DEG;
  const y = m * (latitude - frame.centerLatitude) * DEG;
  return rotate([x, y], -frame.rotation);
}

/** Yerel metre → WGS84 [boylam, enlem]. */
export function localToWgs84(point: LocalPoint, frame: LocalFrame): [number, number] {
  const [x, y] = rotate(point, frame.rotation);
  const { n, m } = curvature(frame.centerLatitude);
  const longitude =
    frame.centerLongitude + x / (n * Math.cos(frame.centerLatitude * DEG) * DEG);
  const latitude = frame.centerLatitude + y / (m * DEG);
  return [longitude, latitude];
}

function rotate(p: LocalPoint, degrees: number): LocalPoint {
  if (degrees === 0) return p;
  const r = degrees * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}

/**
 * WGS84 lon/lat halkasını yerel metrik halkaya çevirir ve çerçeveyi üretir.
 * Origin, halkanın ağırlık merkezidir (önce kaba bir teğet düzlemde bulunur,
 * sonra o merkeze göre yeniden hesaplanır — tek adım yeterlidir, çünkü
 * merkez kayması metre mertebesindedir ve eğrilik yarıçapları o ölçekte sabittir).
 */
export function ringFromWgs84(lonLat: readonly (readonly [number, number])[]): {
  ring: LocalRing;
  frame: LocalFrame;
} {
  if (lonLat.length === 0) {
    return { ring: [], frame: { centerLatitude: 0, centerLongitude: 0, rotation: 0 } };
  }

  // Kaba merkez: aritmetik ortalama.
  let sx = 0;
  let sy = 0;
  for (const [lon, lat] of lonLat) {
    sx += lon;
    sy += lat;
  }
  const rough: LocalFrame = {
    centerLongitude: sx / lonLat.length,
    centerLatitude: sy / lonLat.length,
    rotation: 0,
  };

  // Kaba çerçevede yerelleştir, gerçek ağırlık merkezini bul.
  const roughRing = normalizeRing(lonLat.map(([lon, lat]) => wgs84ToLocal(lon, lat, rough)));
  const centroid = ringCentroid(roughRing);
  const [centerLongitude, centerLatitude] = localToWgs84(centroid, rough);

  const frame: LocalFrame = { centerLatitude, centerLongitude, rotation: 0 };
  const ring = normalizeRing(lonLat.map(([lon, lat]) => wgs84ToLocal(lon, lat, frame)));
  return { ring, frame };
}

/**
 * Zaten METRİK bir grid'deki (TUREF/TM, UTM…) koordinatları yerelleştirir:
 * yalnızca ağırlık merkezi çıkarılır, projeksiyon dönüşümü YAPILMAZ.
 *
 * Türk kadastral alanları bu grid koordinatlarından hesaplanır; grid'i olduğu
 * gibi kullanmak HUKUKEN TUTARLI olandır. WGS84'e çevirip "gerçek" alan
 * hesaplamak resmî alanla uyuşmaz.
 *
 * Ayrıca ham grid koordinatı (x≈500.000, y≈4.400.000) Clipper'ın hızlı
 * 64-bit aralığını aşar; ağırlık merkezine öteleme bunu da çözer.
 */
export function ringFromProjectedGrid(
  grid: readonly (readonly [number, number])[],
): { ring: LocalRing; origin: LocalPoint } {
  const closed = normalizeRing(grid.map(([x, y]) => [x, y] as LocalPoint));
  if (closed.length === 0) return { ring: [], origin: [0, 0] };
  const origin = ringCentroid(closed);
  return {
    ring: closed.map((p) => [p[0] - origin[0], p[1] - origin[1]] as LocalPoint),
    origin,
  };
}
