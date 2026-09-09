import type { LocalMultiPolygon, LocalPoint, LocalPolygon, LocalRing } from "./types";

/**
 * ÖLÇÜM — alan, çevre, ağırlık merkezi, sarım yönü.
 * Saf fonksiyonlar, bağımlılık yok. Tüm birimler metre / metrekare.
 */

/** Halkayı kapatır (ilk = son) ve ardışık yinelenen noktaları atar. */
export function normalizeRing(ring: LocalRing): LocalPoint[] {
  const pts: LocalPoint[] = [];
  for (const p of ring) {
    const last = pts[pts.length - 1];
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    pts.push([p[0], p[1]]);
  }
  // Kapanışı çıkar; tek kaynaktan yeniden ekleyeceğiz.
  while (pts.length > 1) {
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) pts.pop();
    else break;
  }
  if (pts.length === 0) return [];
  pts.push([pts[0]![0], pts[0]![1]]);
  return pts;
}

/** Kapalı halkanın köşe sayısı (kapanış noktası sayılmaz). */
export function vertexCount(ring: LocalRing): number {
  const r = normalizeRing(ring);
  return Math.max(0, r.length - 1);
}

/**
 * İŞARETLİ alan (shoelace). Pozitif = saat yönünün TERSİ (CCW).
 * İşaret sarım yönünü taşır; mutlak alan için `ringArea`.
 */
export function signedRingArea(ring: LocalRing): number {
  const r = normalizeRing(ring);
  if (r.length < 4) return 0; // en az 3 köşe + kapanış
  let sum = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i]!;
    const b = r[i + 1]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

export function ringArea(ring: LocalRing): number {
  return Math.abs(signedRingArea(ring));
}

/** true = saat yönünün tersi (CCW), yani pozitif alan. */
export function isCounterClockwise(ring: LocalRing): boolean {
  return signedRingArea(ring) > 0;
}

/** Halkayı istenen sarım yönüne çevirir. */
export function orientRing(ring: LocalRing, counterClockwise: boolean): LocalPoint[] {
  const r = normalizeRing(ring);
  if (r.length === 0) return r;
  return isCounterClockwise(r) === counterClockwise ? r : [...r].reverse();
}

export function ringPerimeter(ring: LocalRing): number {
  const r = normalizeRing(ring);
  let sum = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i]!;
    const b = r[i + 1]!;
    sum += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return sum;
}

/** Poligon alanı: dış halka eksi delikler. */
export function polygonArea(poly: LocalPolygon): number {
  const [outer, ...holes] = poly.coordinates;
  if (!outer) return 0;
  return holes.reduce((acc, h) => acc - ringArea(h), ringArea(outer));
}

/** Dış çevre. Delikler DAHİL EDİLMEZ — çekme mesafesi dış sınıra uygulanır. */
export function polygonPerimeter(poly: LocalPolygon): number {
  const outer = poly.coordinates[0];
  return outer ? ringPerimeter(outer) : 0;
}

export function multiPolygonArea(mp: LocalMultiPolygon): number {
  return mp.coordinates.reduce((acc, rings) => {
    const [outer, ...holes] = rings;
    if (!outer) return acc;
    return acc + holes.reduce((a, h) => a - ringArea(h), ringArea(outer));
  }, 0);
}

/** Parça sayısı — öteleme bölmüşse > 1, yok etmişse 0. */
export function partCount(mp: LocalMultiPolygon): number {
  return mp.coordinates.length;
}

/**
 * Alan ağırlıklı merkez (centroid). Yerel çerçevenin origin'i budur.
 * Dejenere (sıfır alanlı) halkada köşe ortalamasına düşer.
 */
export function ringCentroid(ring: LocalRing): LocalPoint {
  const r = normalizeRing(ring);
  if (r.length < 2) return r[0] ?? [0, 0];

  const a2 = signedRingArea(r) * 2;
  if (a2 === 0) {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < r.length - 1; i++) {
      sx += r[i]![0];
      sy += r[i]![1];
    }
    const n = r.length - 1;
    return [sx / n, sy / n];
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const p = r[i]!;
    const q = r[i + 1]!;
    const cross = p[0] * q[1] - q[0] * p[1];
    cx += (p[0] + q[0]) * cross;
    cy += (p[1] + q[1]) * cross;
  }
  return [cx / (3 * a2), cy / (3 * a2)];
}

/** Halkanın i. kenarı: [başlangıç, bitiş]. */
export function edgeAt(ring: LocalRing, index: number): [LocalPoint, LocalPoint] {
  const r = normalizeRing(ring);
  const n = r.length - 1;
  const i = ((index % n) + n) % n;
  return [r[i]!, r[i + 1]!];
}

/** Halkanın kenar sayısı. */
export function edgeCount(ring: LocalRing): number {
  return vertexCount(ring);
}

/**
 * Halka kendini kesiyor mu? Basit O(n²) tarama — parsel poligonları küçüktür
 * (onlarca köşe), performans sorun değil.
 *
 * Kendini kesen bir parsel sınırı GEÇERSİZ girdidir: alanı anlamsızdır ve
 * öteleme sessizce yanlış sonuç verir. Bu yüzden içe aktarımda kontrol edilir.
 */
export function isSelfIntersecting(ring: LocalRing): boolean {
  const r = normalizeRing(ring);
  const n = r.length - 1;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // Komşu kenarlar ortak köşe paylaşır; kapanışta ilk ve son da komşudur.
      if (j === i + 1) continue;
      if (i === 0 && j === n - 1) continue;
      if (segmentsProperlyIntersect(r[i]!, r[i + 1]!, r[j]!, r[j + 1]!)) return true;
    }
  }
  return false;
}

function orientation(a: LocalPoint, b: LocalPoint, c: LocalPoint): number {
  const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(v) < 1e-12) return 0;
  return v > 0 ? 1 : -1;
}

function onSegment(a: LocalPoint, b: LocalPoint, p: LocalPoint): boolean {
  return (
    Math.min(a[0], b[0]) - 1e-12 <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) + 1e-12 &&
    Math.min(a[1], b[1]) - 1e-12 <= p[1] &&
    p[1] <= Math.max(a[1], b[1]) + 1e-12
  );
}

function segmentsProperlyIntersect(
  p1: LocalPoint,
  p2: LocalPoint,
  q1: LocalPoint,
  q2: LocalPoint,
): boolean {
  const o1 = orientation(p1, p2, q1);
  const o2 = orientation(p1, p2, q2);
  const o3 = orientation(q1, q2, p1);
  const o4 = orientation(q1, q2, p2);

  if (o1 !== o2 && o3 !== o4) return true;

  // Eşdoğrusal örtüşme de kesişimdir.
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, p2, q2)) return true;
  if (o3 === 0 && onSegment(q1, q2, p1)) return true;
  if (o4 === 0 && onSegment(q1, q2, p2)) return true;

  return false;
}

// ============================================================================
// İP-3 eklemeleri — çekirdek yerleşimi için gereken ilkeller.
// ============================================================================

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Eksen hizalı sınırlayıcı kutu. Boş poligonda tüm alanlar 0.
 *
 * DÖNÜK minimum dikdörtgen DEĞİLDİR: plaka en-boy oranını kabaca ölçmek için
 * yeterli ve L1 strateji önerisi zaten bir öneridir, optimizasyon değil.
 */
export function boundingBox(poly: LocalPolygon): BoundingBox {
  const outer = normalizeRing(poly.coordinates[0] ?? []);
  if (outer.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of outer) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Nokta halkanın içinde mi? Işın atma (ray casting), tek halka.
 *
 * SINIR DAHİLDİR: kenarın üzerindeki nokta "içeride" sayılır. Çekirdek
 * köşesi zarfın kenarına tam oturduğunda dışarıda saymak, geçerli bir
 * yerleşimi reddetmek olurdu.
 */
export function pointInRing(point: LocalPoint, ring: LocalRing): boolean {
  const r = normalizeRing(ring);
  if (r.length < 4) return false;

  // Önce sınır kontrolü — ray casting sınırda kararsızdır.
  for (let i = 0; i < r.length - 1; i++) {
    const a = r[i]!;
    const b = r[i + 1]!;
    if (orientation(a, b, point) === 0 && onSegment(a, b, point)) return true;
  }

  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length - 1; j = i++) {
    const [xi, yi] = r[i]!;
    const [xj, yj] = r[j]!;
    if (yi > point[1] !== yj > point[1]) {
      const x = ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
      if (point[0] < x) inside = !inside;
    }
  }
  return inside;
}

/** Nokta poligonun içinde mi? Delikler DIŞARIDIR. */
export function pointInPolygon(point: LocalPoint, poly: LocalPolygon): boolean {
  const [outer, ...holes] = poly.coordinates;
  if (!outer || !pointInRing(point, outer)) return false;
  for (const hole of holes) {
    if (pointInRing(point, hole)) return false;
  }
  return true;
}

/** Noktanın bir DOĞRU PARÇASINA (doğruya değil) uzaklığı. */
export function distancePointToSegment(p: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);

  // Parçaya izdüşüm [0,1] aralığına KIRPILIR — doğruya değil parçaya uzaklık.
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Noktanın halkanın SINIRINA uzaklığı. İçeride olsa bile pozitiftir. */
export function distanceToRing(p: LocalPoint, ring: LocalRing): number {
  const r = normalizeRing(ring);
  if (r.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < r.length - 1; i++) {
    const d = distancePointToSegment(p, r[i]!, r[i + 1]!);
    if (d < best) best = d;
  }
  return best;
}
