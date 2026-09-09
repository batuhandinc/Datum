import { booleanOp } from "./clipper";
import { multiPolygonArea, polygonArea } from "./measure";
import { polygon, type LocalPoint, type LocalPolygon, type LocalRing } from "./types";

/**
 * DÖNÜŞÜMLER VE BASİT FORMLAR — İP-3 çekirdek yerleşimi için.
 *
 * Çekirdek poligonu BASİT tutulur (dikdörtgen veya L). Optimize edilmiş
 * serbest form plan motorunun (İP-4) işidir; burada üretilen şey kullanıcının
 * taşıyıp boyutlandıracağı bir ÖNERİDİR.
 */

/** Halkayı öteler. */
function translateRing(ring: LocalRing, dx: number, dy: number): LocalPoint[] {
  return ring.map(([x, y]) => [x + dx, y + dy] as LocalPoint);
}

/** Poligonu (delikleriyle birlikte) öteler. */
export function translatePolygon(poly: LocalPolygon, dx: number, dy: number): LocalPolygon {
  return polygon(poly.coordinates.map((r) => translateRing(r, dx, dy)));
}

/**
 * Poligonu bir merkez etrafında döndürür. Açı DERECE, saat yönünün tersi.
 *
 * İP-3'te çekirdek daima eksen hizalı yerleşir (parselin dönüklüğü
 * `Parcel.rotation` ile zaten 0); bu fonksiyon L formunu dört yöne
 * çevirmek için var.
 */
export function rotatePolygon(
  poly: LocalPolygon,
  degrees: number,
  center: LocalPoint = [0, 0],
): LocalPolygon {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return polygon(
    poly.coordinates.map((ring) =>
      ring.map(([x, y]) => {
        const dx = x - center[0];
        const dy = y - center[1];
        return [center[0] + dx * cos - dy * sin, center[1] + dx * sin + dy * cos] as LocalPoint;
      }),
    ),
  );
}

/** Merkezi verilen eksen hizalı dikdörtgen. Saat yönünün tersi sarım. */
export function rectangle(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): LocalPolygon {
  const hw = width / 2;
  const hh = height / 2;
  return polygon([
    [
      [centerX - hw, centerY - hh],
      [centerX + hw, centerY - hh],
      [centerX + hw, centerY + hh],
      [centerX - hw, centerY + hh],
      [centerX - hw, centerY - hh],
    ],
  ]);
}

/**
 * L formu: `width × height` dikdörtgenden SAĞ ÜST köşesi kesilmiş hâli.
 *
 * Kesilen parça `notchWidth × notchHeight`. Diğer üç yön `rotatePolygon` ile
 * elde edilir — dört ayrı fonksiyon yazmak yerine tek form + döndürme.
 */
export function lShape(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  notchWidth: number,
  notchHeight: number,
): LocalPolygon {
  const x0 = centerX - width / 2;
  const y0 = centerY - height / 2;
  const x1 = centerX + width / 2;
  const y1 = centerY + height / 2;
  const nx = x1 - notchWidth;
  const ny = y1 - notchHeight;

  return polygon([
    [
      [x0, y0],
      [x1, y0],
      [x1, ny],
      [nx, ny],
      [nx, y1],
      [x0, y1],
      [x0, y0],
    ],
  ]);
}

/**
 * `inner` tamamen `outer`'ın içinde mi?
 *
 * `inner ∖ outer` boşsa içeridedir. Nokta örneklemesi yerine boolean cebri
 * kullanılıyor çünkü köşeleri içeride olan bir poligonun KENARI dışarı
 * taşabilir (içbükey parselde tipik) — köşe kontrolü bunu kaçırırdı.
 *
 * `epsilon`: kayan nokta gürültüsü için alan toleransı (m²). Clipper tamsayı
 * ızgarada çalıştığı için sınırda birkaç mm²'lik artık kalabiliyor.
 */
export function containsPolygon(
  outer: LocalPolygon,
  inner: LocalPolygon,
  epsilon = 1e-6,
): boolean {
  if (polygonArea(inner) <= 0) return false;
  const outside = booleanOp([inner], [outer], "difference");
  return multiPolygonArea(outside) <= epsilon;
}

/** İki poligon kesişiyor mu? (alanı olan bir ortaklık var mı) */
export function intersects(a: LocalPolygon, b: LocalPolygon, epsilon = 1e-9): boolean {
  return multiPolygonArea(booleanOp([a], [b], "intersection")) > epsilon;
}
