import {
  MITER_LIMIT,
  booleanOp,
  capsuleAroundSegment,
  offsetPolygon,
  simplifyPolygon,
} from "./clipper";
import { edgeCount, orientRing } from "./measure";
import {
  multiPolygon,
  polygon,
  type EdgeSetback,
  type JoinType,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "./types";

/**
 * KENAR BAZINDA İÇE ÖTELEME.
 *
 * `ZoningData` üç AYRI çekme mesafesi tanımlar (ön/yan/arka), dolayısıyla tek
 * tip uniform öteleme YANLIŞTIR. Hiçbir hazır kütüphane kenar bazında değişken
 * öteleme desteklemiyor — Clipper dahil, hepsi tek skaler `delta` alır.
 *
 * İKİ UYGULAMA, `joinType` seçer (paketten gelir):
 *
 *   round → KAPSÜL FARKI. `parsel ∖ ⋃ᵢ kapsül(kenarᵢ, dᵢ)`.
 *           Matematiksel tanım: "sınıra dik uzaklık ≥ d" kümesi.
 *           Bölünme/yok olma/delik topolojisini Clipper halleder.
 *
 *   miter → KENAR DOĞRULARINI ÖTELE, ARDIŞIK KESİŞTİR.
 *           Haritacının çizdiği şey. Miter limit ZORUNLU: limitsizken sivri
 *           köşelerde uzantı patlar ve negatif alanlı halka üretir.
 *
 * DİKKAT — naif "tüm yarı-düzlemlerin kesişimi" YAKLAŞIMI KULLANILMAZ:
 * yalnızca dışbükey poligonlarda doğrudur. L parselinde 3 m çekme için
 * 36 m² verir; doğrusu 222 m². %84 hata.
 */

/** Kenar rolü verilmemişse hangi mesafenin kullanılacağı çağıranın işidir. */
export interface EdgeOffsetInput {
  readonly polygon: LocalPolygon;
  /** Dış halkanın her kenarı için mesafe. Eksik kenar = 0 (öteleme yok). */
  readonly setbacks: readonly EdgeSetback[];
  readonly joinType: JoinType;
}

/**
 * Tüm kenarlara AYNI mesafe uygulanacaksa doğrudan Clipper'ın uniform
 * ötelemesi kullanılır — hem daha hızlı hem de referans uygulamadır.
 */
export function offsetUniform(
  poly: LocalPolygon,
  distance: number,
  joinType: JoinType,
): LocalMultiPolygon {
  if (distance <= 0) return toMultiPolygon(poly);
  return offsetPolygon(poly, -distance, joinType);
}

export function offsetByEdge(input: EdgeOffsetInput): LocalMultiPolygon {
  const { polygon: poly, setbacks, joinType } = input;
  const outer = poly.coordinates[0];
  if (!outer) return multiPolygon([]);

  const n = edgeCount(outer);
  if (n < 3) return multiPolygon([]);

  const distances = new Array<number>(n).fill(0);
  for (const s of setbacks) {
    if (s.edgeIndex >= 0 && s.edgeIndex < n && s.distance > 0) {
      distances[s.edgeIndex] = s.distance;
    }
  }

  if (distances.every((d) => d === 0)) return toMultiPolygon(poly);

  // Hepsi eşitse uniform yola düş — Clipper'ın referans uygulaması.
  const first = distances[0]!;
  if (distances.every((d) => d === first)) return offsetUniform(poly, first, joinType);

  return joinType === "round"
    ? offsetByEdgeRound(poly, distances)
    : offsetByEdgeMiter(poly, distances);
}

// ---------------------------------------------------------------- round

/**
 * `parsel ∖ ⋃ᵢ kapsül(kenarᵢ, dᵢ)`.
 * Kapsül = kenarın dᵢ yarıçaplı yuvarlak uçlu şeridi.
 *
 * DIŞA AÇIK ÇÜNKÜ TEST EDİLİYOR: `offsetByEdge` tüm mesafeler eşitken uniform
 * yola kısa devre yapar; o zaman "kenar bazlı ≡ uniform" testi kendini
 * doğrulamış olurdu. Test bu fonksiyonu doğrudan çağırır.
 */
export function offsetByEdgeRound(
  poly: LocalPolygon,
  distances: readonly number[],
): LocalMultiPolygon {
  const ring = orientRing(poly.coordinates[0]!, true);
  const capsules: LocalPolygon[] = [];

  for (let i = 0; i < distances.length; i++) {
    const d = distances[i]!;
    if (d <= 0) continue;
    const caps = capsuleAroundSegment(ring[i]!, ring[i + 1]!, d);
    for (const rings of caps.coordinates) capsules.push(polygon(rings));
  }

  if (capsules.length === 0) return toMultiPolygon(poly);
  return booleanOp([poly], capsules, "difference");
}

// ---------------------------------------------------------------- miter

interface Line {
  /** Doğru üzerinde bir nokta. */
  readonly p: LocalPoint;
  /** Birim yön vektörü. */
  readonly d: LocalPoint;
}

/**
 * Her kenarın taşıyıcı doğrusunu içe öteler, ardışık doğruları kesiştirir.
 * Poligonun kombinatorik yapısı korunur; büyük ötelemede oluşan kendini
 * kesmeler Clipper'ın `SimplifyPolygons`'ı ile temizlenir.
 */
export function offsetByEdgeMiter(
  poly: LocalPolygon,
  distances: readonly number[],
): LocalMultiPolygon {
  const ring = orientRing(poly.coordinates[0]!, true);
  const n = distances.length;

  // CCW halkada iç bölge her yönlü kenarın SOLUNDADIR; sol normal içe bakar.
  const lines: Line[] = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    if (len === 0) return multiPolygon([]);
    const ux = ex / len;
    const uy = ey / len;
    const nx = -uy; // sol normal
    const ny = ux;
    const d = distances[i]!;
    lines.push({ p: [a[0] + nx * d, a[1] + ny * d], d: [ux, uy] });
  }

  const out: LocalPoint[] = [];
  for (let i = 0; i < n; i++) {
    const prev = lines[(i - 1 + n) % n]!;
    const cur = lines[i]!;
    const original = ring[i]!;
    const hit = intersectLines(prev, cur);

    if (!hit) {
      // Eşdoğrusal veya paralel kenarlar: ötelenmiş noktayı doğrudan kullan.
      out.push(cur.p);
      continue;
    }

    // MITER LİMİTİ — sivri köşede uzantı patlar. Sınırı aşarsa köşeyi pahla.
    const reach = Math.hypot(hit[0] - original[0], hit[1] - original[1]);
    const dPrev = distances[(i - 1 + n) % n]!;
    const dCur = distances[i]!;
    const limit = MITER_LIMIT * Math.max(dPrev, dCur);

    if (limit > 0 && reach > limit) {
      // Pah: iki ötelenmiş kenarın kendi uç noktaları.
      const prevEnd = projectOnto(prev, original);
      const curStart = projectOnto(cur, original);
      out.push(prevEnd, curStart);
    } else {
      out.push(hit);
    }
  }

  if (out.length < 3) return multiPolygon([]);

  // Kendini kesmeleri ve negatif alanlı ilmekleri temizle.
  const raw = simplifyPolygon(polygon([out]));
  if (raw.coordinates.length === 0) return raw;

  // SINIRLAMA — matematiksel olarak sağlam, kozmetik değil.
  //
  // Miter bölgesi tanım gereği "her kenar DOĞRUSUNA uzaklık ≥ d" kümesidir.
  // Bir noktanın kenar PARÇASINA uzaklığı, o kenarın doğrusuna uzaklığından
  // küçük olamaz; dolayısıyla  miter ⊆ round  her zaman doğrudur.
  //
  // Sivri uçlu parsellerde (iç açı → 0) miter köşesi içeri doğru sonsuza
  // kaçar: doğru cevap "uç yok olur", ama doğru kesişimi devasa sahte bir
  // bölge üretir. round sonucuyla kesiştirmek bu taşmayı keser ve iyi
  // koşullu parsellerde HİÇBİR ŞEYİ değiştirmez.
  const bound = offsetByEdgeRound(poly, distances);
  if (bound.coordinates.length === 0) return multiPolygon([]);

  return booleanOp(
    raw.coordinates.map((rings) => polygon(rings)),
    bound.coordinates.map((rings) => polygon(rings)),
    "intersection",
  );
}

function intersectLines(a: Line, b: Line): LocalPoint | null {
  const denom = a.d[0] * b.d[1] - a.d[1] * b.d[0];
  if (Math.abs(denom) < 1e-12) return null;
  const dx = b.p[0] - a.p[0];
  const dy = b.p[1] - a.p[1];
  const t = (dx * b.d[1] - dy * b.d[0]) / denom;
  return [a.p[0] + a.d[0] * t, a.p[1] + a.d[1] * t];
}

/** Bir noktanın doğru üzerindeki dik izdüşümü. */
function projectOnto(line: Line, point: LocalPoint): LocalPoint {
  const vx = point[0] - line.p[0];
  const vy = point[1] - line.p[1];
  const t = vx * line.d[0] + vy * line.d[1];
  return [line.p[0] + line.d[0] * t, line.p[1] + line.d[1] * t];
}

// ---------------------------------------------------------------- yardımcı

function toMultiPolygon(poly: LocalPolygon): LocalMultiPolygon {
  return multiPolygon([poly.coordinates]);
}
