import { SCALE, normalizeRing, type LocalPoint, type LocalPolygon, type LocalRing } from "@/lib/geometry";

/**
 * ORTAK SINIR ALGEBRASI — duvarın, kapının ve cephe temasının TEK kaynağı.
 *
 * SAF: Prisma/Next yok.
 *
 * NEDEN AYRI BİR MODÜL. `booleanOp` bir `LocalMultiPolygon` döndürür: köşe
 * dizisi, topoloji değil. Hangi kenarın hangi girdiden geldiği bilgisi
 * clipper'ın PolyTree'sinde KORUNMAZ. Dolayısıyla "bu iki mekan hangi
 * parçada komşu" sorusu, çıktı poligonları üzerinde SONRADAN kurulmak
 * zorundadır — bu dosya onu yapar.
 *
 * TOLERANS NEDEN SIFIR DEĞİL. clipper her koordinatı `SCALE` (=1000) ile
 * çarpıp yuvarlar; köşe başına ±0,5 mm sapma olur. Art arda kırpılmış iki
 * kardeş hücrenin "aynı" kenarı bu yüzden tam çakışmaz. `measure.ts`'in
 * mevcut eşdoğrusallık toleransı 1e-12'dir ve döndürülmüş her kesimde
 * başarısız olur — bu yüzden burada IZGARADAN TÜRETİLMİŞ bir tolerans var.
 */

/** İki uçlu doğru parçası. */
export type Segment = readonly [LocalPoint, LocalPoint];

/**
 * Eşdoğrusallık toleransı (metre).
 *
 * Izgara birimi 1 mm; iki köşe zıt yönlere yuvarlanırsa fark 1 mm'ye çıkar,
 * kenar boyunca birikimle biraz daha. 2 mm bunun üstünde, gerçek bir duvar
 * kaymasının (santimetreler) altındadır.
 */
export const COLLINEAR_TOLERANCE = 2 / SCALE;

/**
 * Anlamlı sayılan asgari ortak kenar uzunluğu (metre).
 *
 * ALGORİTMİK KORKULUK, tasarım parametresi DEĞİL: 1 cm'lik bir "ortak kenar"
 * iki poligonun köşede teğet geçmesinden doğan sayısal enkazdır, duvar değil.
 * Izgaranın 10 katına çivilendi ki eşik ile gürültü arasındaki ilişki açık kalsın.
 */
export const MIN_RUN_LENGTH = 10 / SCALE;

/** Halkanın kenarlarını parça listesine çevirir. */
export function ringSegments(ring: LocalRing): Segment[] {
  const closed = normalizeRing(ring);
  const out: Segment[] = [];
  for (let i = 0; i < closed.length - 1; i += 1) {
    out.push([closed[i]!, closed[i + 1]!]);
  }
  return out;
}

/** Poligonun DIŞ halkasının kenarları. Delikler duvar üretmez. */
export function outerSegments(poly: LocalPolygon): Segment[] {
  const outer = poly.coordinates[0];
  return outer ? ringSegments(outer) : [];
}

/** İki parçanın eşdoğrusal ÖRTÜŞEN kısmı; yoksa null. */
export function overlapOf(
  a: Segment,
  b: Segment,
  tolerance = COLLINEAR_TOLERANCE,
): Segment | null {
  const [p1, p2] = a;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const lenSq = dx * dx + dy * dy;
  // KARE uzunlukla karşılaştırma: karar veren yolda `sqrt` YOK (belirtimi
  // yaklaşık; alan ve kare uzunluk ise tam belirtilmiş çarpma/toplamadır).
  if (lenSq === 0) return null;
  const len = Math.sqrt(lenSq);
  const ux = dx / len;
  const uy = dy / len;

  // b'nin iki ucu da a'nın DOĞRUSUNA tolerans içinde mi?
  const perp = (q: LocalPoint): number => Math.abs(-(q[0] - p1[0]) * uy + (q[1] - p1[1]) * ux);
  if (perp(b[0]) > tolerance || perp(b[1]) > tolerance) return null;

  const proj = (q: LocalPoint): number => (q[0] - p1[0]) * ux + (q[1] - p1[1]) * uy;
  const t0 = proj(b[0]);
  const t1 = proj(b[1]);
  const lo = Math.max(0, Math.min(t0, t1));
  const hi = Math.min(len, Math.max(t0, t1));
  if (hi - lo < MIN_RUN_LENGTH) return null;

  return [
    [p1[0] + lo * ux, p1[1] + lo * uy],
    [p1[0] + hi * ux, p1[1] + hi * uy],
  ];
}

/**
 * İKİ POLİGONUN ORTAK SINIR PARÇALARI.
 *
 * Duvarın ve kapının TEK kaynağıdır: iki mekanın paylaştığı her parça bir
 * duvar satırı doğurur, ilişki iddiası bağlantı diyorsa üzerine kapı gelir.
 *
 * Sonuç DETERMİNİSTİK sıradadır: a'nın kenar sırası, sonra b'nin.
 */
export function sharedBoundaryRuns(
  a: LocalPolygon,
  b: LocalPolygon,
  tolerance = COLLINEAR_TOLERANCE,
): Segment[] {
  const out: Segment[] = [];
  for (const ea of outerSegments(a)) {
    for (const eb of outerSegments(b)) {
      const run = overlapOf(ea, eb, tolerance);
      if (run) out.push(run);
    }
  }
  return out;
}

/** Parçanın uzunluğu. RAPORLAMA içindir — karar veren yolda kullanılmaz. */
export function segmentLength(s: Segment): number {
  return Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]);
}

/** Parça listesinin toplam uzunluğu. */
export function totalLength(segments: readonly Segment[]): number {
  return segments.reduce((sum, s) => sum + segmentLength(s), 0);
}

/**
 * POLİGONUN VERİLEN KENAR KÜMESİNE TEMAS UZUNLUĞU.
 *
 * İmza neden `LocalRing` değil `Segment[]`: cephe bir HALKA DEĞİLDİR, birim
 * halkasının SINIFLANDIRILMIŞ bir alt kümesidir. Halka verilseydi ölçüm
 * ortak (party) duvarları da cepheye sayardı ve `bitisik`/`blok` nizamda
 * penceresiz bir birim cephe denetiminden SESSİZCE geçerdi — tam olarak
 * kaçınılması gereken iyimser hata.
 */
export function contactLength(
  poly: LocalPolygon,
  segments: readonly Segment[],
  tolerance = COLLINEAR_TOLERANCE,
): number {
  let sum = 0;
  for (const edge of outerSegments(poly)) {
    for (const target of segments) {
      const run = overlapOf(edge, target, tolerance);
      if (run) sum += segmentLength(run);
    }
  }
  return sum;
}

/**
 * TEMAS VAR MI — kuralsız bilinebilen topolojik olgu.
 *
 * `contactLength(...) > 0` ile aynı şeydir ama AYRI bir isim taşır çünkü
 * kullanım yeri farklıdır: "değiyor mu" bir OLGUDUR ve paket satırı
 * gerektirmez; "yeterince mi değiyor" bir HÜKÜMDÜR ve eşik ister.
 *
 * Eksik bir kural yüzünden olgunun da "değerlendirilemedi" sayılması,
 * eksik paketin sessizce yeşil ışık yakması demektir.
 */
export function touches(
  poly: LocalPolygon,
  segments: readonly Segment[],
  tolerance = COLLINEAR_TOLERANCE,
): boolean {
  for (const edge of outerSegments(poly)) {
    for (const target of segments) {
      if (overlapOf(edge, target, tolerance)) return true;
    }
  }
  return false;
}
