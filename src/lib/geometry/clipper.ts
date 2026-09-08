import ClipperLib from "clipper-lib";
import type { JoinType, LocalMultiPolygon, LocalPolygon, LocalRing } from "./types";
import { multiPolygon } from "./types";
import { normalizeRing, orientRing } from "./measure";

/**
 * CLIPPER SARMALAYICI.
 *
 * clipper-lib TAMSAYI koordinatla çalışır. Yerel metrik koordinatları 1000 ile
 * ölçekleriz → milimetre hassasiyeti.
 *
 * Ölçek seçiminin gerekçesi (kütüphaneden okunan gerçek sabitler):
 *   loRange = 47.453.132  → ±47 km'ye kadar HIZLI 64-bit yol
 *   hiRange = 4,5e15      → üstünde big-integer'a düşer
 * Koordinatlar parselin AĞIRLIK MERKEZİNE göre olduğu için değerler ±200 m
 * civarında kalır; her zaman hızlı yoldayız. Ham TUREF/TM koordinatı
 * (x≈500.000, y≈4.400.000) ölçeklenseydi 4,4e9 > loRange olur ve yavaş yola düşerdi.
 *
 * NOT: enum değerleri KÜTÜPHANEDEN okunur, sabit yazılmaz. `etClosedPolygon`
 * bu sürümde 4'tür (0 değil); yanlış sabit poligonu açık uçlu çizgi gibi
 * öteler ve sessizce tamamen yanlış sonuç verir.
 */

// clipper-lib CJS'tir ve tek bir default export verir.
const CL = ((ClipperLib as unknown as { default?: unknown }).default ??
  ClipperLib) as typeof ClipperLib;

export const SCALE = 1000;

/**
 * Miter limit — ZORUNLU. Limitsizken sivri köşelerde miter uzantısı patlar:
 * 3000 rastgele poligonluk stres testinde 2900 alan uyuşmazlığı ve 57 negatif
 * alanlı halka üretiyordu. 2.0 Clipper'ın da önerdiği değerdir.
 */
export const MITER_LIMIT = 2.0;

/** Yay ayrıklaştırma hassasiyeti (ölçekli birim). round join için. */
const ARC_TOLERANCE = 0.25 * SCALE * 0.01;

interface IntPoint {
  X: number;
  Y: number;
}

function ringToPath(ring: LocalRing): IntPoint[] {
  // Clipper kapanış noktası İSTEMEZ — kapalı poligon varsayar.
  const r = normalizeRing(ring);
  const open = r.slice(0, Math.max(0, r.length - 1));
  return open.map((p) => ({
    X: Math.round(p[0] * SCALE),
    Y: Math.round(p[1] * SCALE),
  }));
}

function pathToRing(path: IntPoint[]): LocalRing {
  const pts = path.map((p) => [p.X / SCALE, p.Y / SCALE] as const);
  return normalizeRing(pts);
}

/** Poligonun tüm halkalarını Clipper yoluna çevirir (dış + delikler). */
function polygonToPaths(poly: LocalPolygon): IntPoint[][] {
  return poly.coordinates
    .map((ring, i) =>
      // Clipper delikleri ters sarımdan tanır: dış CCW, delik CW.
      ringToPath(orientRing(ring, i === 0)),
    )
    .filter((p) => p.length >= 3);
}

/**
 * PolyTree'yi gezip dış halka + delikleri doğru eşleştirir.
 * Düz `Paths` kullansaydık hangi deliğin hangi dış halkaya ait olduğu kaybolurdu.
 */
function polyTreeToMultiPolygon(tree: unknown): LocalMultiPolygon {
  const parts: LocalRing[][] = [];

  interface Node {
    m_Childs: Node[];
    m_polygon: IntPoint[];
    IsHole: () => boolean;
  }

  const visitOuter = (node: Node): void => {
    const outer = pathToRing(node.m_polygon);
    if (outer.length >= 4) {
      const rings: LocalRing[] = [outer];
      for (const child of node.m_Childs) {
        // Doğrudan çocuklar deliktir; deliğin çocukları YENİ dış halkalardır.
        const hole = pathToRing(child.m_polygon);
        if (hole.length >= 4) rings.push(hole);
        for (const grandChild of child.m_Childs) visitOuter(grandChild);
      }
      parts.push(rings);
    }
  };

  for (const child of (tree as { m_Childs: Node[] }).m_Childs) visitOuter(child);
  return multiPolygon(parts);
}

/**
 * Tek tip (uniform) içe/dışa öteleme.
 * `distance` NEGATİF ise içe, pozitifse dışa.
 *
 * İçe ötelemede poligon BÖLÜNEBİLİR (çoklu parça) veya YOK OLABİLİR (boş sonuç).
 * İkisi de geçerli sonuçtur, hata değildir.
 */
export function offsetPolygon(
  poly: LocalPolygon,
  distance: number,
  joinType: JoinType,
): LocalMultiPolygon {
  const paths = polygonToPaths(poly);
  if (paths.length === 0) return multiPolygon([]);

  const co = new CL.ClipperOffset(MITER_LIMIT, ARC_TOLERANCE);
  const jt = joinType === "miter" ? CL.JoinType.jtMiter : CL.JoinType.jtRound;

  for (const path of paths) {
    co.AddPath(path as never, jt, CL.EndType.etClosedPolygon);
  }

  const tree = new CL.PolyTree();
  co.Execute(tree as never, distance * SCALE);
  return polyTreeToMultiPolygon(tree);
}

/**
 * Bir doğru parçasının `radius` yarıçaplı KAPSÜLÜ (yuvarlak uçlu şerit).
 *
 * `round` kenar bazlı ötelemenin yapı taşı: parselden her kenarın kapsülünü
 * çıkarmak, "sınıra dik uzaklık ≥ d" kümesini verir. Bölünme, yok olma ve
 * delik topolojisini Clipper'ın boolean motoru halleder — elle yazılmış
 * köşe temizliği değil.
 */
export function capsuleAroundSegment(
  a: readonly [number, number],
  b: readonly [number, number],
  radius: number,
): LocalMultiPolygon {
  if (radius <= 0) return multiPolygon([]);

  const co = new CL.ClipperOffset(MITER_LIMIT, ARC_TOLERANCE);
  const path: IntPoint[] = [
    { X: Math.round(a[0] * SCALE), Y: Math.round(a[1] * SCALE) },
    { X: Math.round(b[0] * SCALE), Y: Math.round(b[1] * SCALE) },
  ];
  co.AddPath(path as never, CL.JoinType.jtRound, CL.EndType.etOpenRound);

  const tree = new CL.PolyTree();
  co.Execute(tree as never, radius * SCALE);
  return polyTreeToMultiPolygon(tree);
}

export type BooleanOp = "difference" | "intersection" | "union";

/**
 * Boolean işlem. Kenar bazlı öteleme bunu kullanır: parselden her kenarın
 * "kapsül"ünü çıkarmak, bölünme/yok olma/delik topolojisini bize değil
 * CLIPPER'a yaptırır — savaş görmüş kod, elle yazılmış köşe temizliği değil.
 */
export function booleanOp(
  subject: readonly LocalPolygon[],
  clip: readonly LocalPolygon[],
  op: BooleanOp,
): LocalMultiPolygon {
  const clipper = new CL.Clipper();

  for (const poly of subject) {
    const paths = polygonToPaths(poly);
    if (paths.length > 0) clipper.AddPaths(paths as never, CL.PolyType.ptSubject, true);
  }
  for (const poly of clip) {
    const paths = polygonToPaths(poly);
    if (paths.length > 0) clipper.AddPaths(paths as never, CL.PolyType.ptClip, true);
  }

  const clipTypes = {
    difference: CL.ClipType.ctDifference,
    intersection: CL.ClipType.ctIntersection,
    union: CL.ClipType.ctUnion,
  } as const;

  const tree = new CL.PolyTree();
  clipper.Execute(
    clipTypes[op],
    tree as never,
    CL.PolyFillType.pftNonZero,
    CL.PolyFillType.pftNonZero,
  );
  return polyTreeToMultiPolygon(tree);
}

/** Kendini kesen veya dejenere halkaları temizler. */
export function simplifyPolygon(poly: LocalPolygon): LocalMultiPolygon {
  const paths = polygonToPaths(poly);
  if (paths.length === 0) return multiPolygon([]);
  const cleaned = CL.Clipper.SimplifyPolygons(paths as never, CL.PolyFillType.pftNonZero);
  // SimplifyPolygons düz Paths döner; hiyerarşiyi union ile geri kazanıyoruz.
  const clipper = new CL.Clipper();
  clipper.AddPaths(cleaned as never, CL.PolyType.ptSubject, true);
  const tree = new CL.PolyTree();
  clipper.Execute(
    CL.ClipType.ctUnion,
    tree as never,
    CL.PolyFillType.pftNonZero,
    CL.PolyFillType.pftNonZero,
  );
  return polyTreeToMultiPolygon(tree);
}
