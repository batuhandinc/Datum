import { normalizeRing, ringArea } from "./measure";
import type { LocalPoint, LocalPolygon, LocalRing } from "./types";

/**
 * DIŞBÜKEY KABUK VE DÖNÜK MİNİMUM DİKDÖRTGEN — İP-4 (plan motoru).
 *
 * SAF: Prisma/Next yok, clipper yok. Tarayıcı ve sunucu aynı dosya.
 *
 * NEDEN GEREKLİ. `measure.ts`'teki `boundingBox` YALNIZCA EKSEN HİZALIDIR ve
 * kendi yorumunda bunu açıkça söyler. Ama `Parcel.rotation`'ın yorumu da
 * "döndürme İP-4'te anlam kazanır" diyor: gerçek parseller yerel eksene EĞİKTİR.
 * Eksen hizalı kutuya dayanan bir bant şeması, grid'e 30° eğik bir plakada
 * her dış kenar boyunca testere dişli birimler üretir.
 *
 * ÜÇ DELİĞİ BİRDEN KAPATIR — üçünün de kaynağı aynıydı:
 *   1. `kenar` stratejisinde koridor omurgasının DOĞRULTUSU
 *   2. Birimin EN-BOY ORANI (kısıt: "aşırı uzun dar birim olmasın")
 *   3. Mekanın ASGARİ NET GENİŞLİĞİ (L3'ün `minClearWidth` kontrolü)
 *
 * DETERMİNİZM. Hiçbir yerde rastgelelik, saat veya tolerans tabanlı erken çıkış
 * yoktur. Sıralama toplamdır (x, sonra y) ve eşitlikler indeksle bozulur.
 * Aynı girdi her zaman aynı çıktıyı verir — ilke 2'nin gereği.
 */

/** İki vektörün çapraz çarpımı: (b−o) × (a−o). Pozitif ise sola dönüş. */
function cross(o: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Dışbükey kabuk — Andrew monoton zinciri, O(n log n).
 *
 * Çıktı SAAT YÖNÜNÜN TERSİNE sıralı ve KAPALIDIR (ilk nokta = son nokta),
 * yani `LocalRing` sözleşmesine uyar.
 *
 * Eşdoğrusal noktalar ATILIR (`<= 0` karşılaştırması): kabuğun kenar sayısı
 * minimum kalır, bu da `minAreaRectangle`'ın aday sayısını düşürür.
 *
 * Dejenere girdi (tek nokta, eşdoğrusal noktalar) `null` döndürür — çağıran
 * bunu "hesaplanamadı" olarak ele almalıdır, sıfır olarak DEĞİL.
 */
export function convexHull(ring: LocalRing): LocalRing | null {
  const closed = normalizeRing(ring);
  // Son nokta ilkin tekrarıdır; kabuk hesabına girmemeli.
  const pts = closed.slice(0, -1);
  if (pts.length < 3) return null;

  // Toplam sıra: x, sonra y. Eşitlik bırakmaz → determinizm.
  const sorted = [...pts].sort((p, q) => (p[0] !== q[0] ? p[0] - q[0] : p[1] - q[1]));

  const build = (points: readonly LocalPoint[]): LocalPoint[] => {
    const chain: LocalPoint[] = [];
    for (const p of points) {
      while (chain.length >= 2 && cross(chain[chain.length - 2]!, chain[chain.length - 1]!, p) <= 0) {
        chain.pop();
      }
      chain.push(p);
    }
    chain.pop(); // son nokta diğer zincirin başlangıcıdır
    return chain;
  };

  const lower = build(sorted);
  const upper = build([...sorted].reverse());
  const hull = [...lower, ...upper];

  // Hepsi eşdoğrusalsa kabuk bir alan çevrelemez.
  if (hull.length < 3) return null;
  return [...hull, hull[0]!];
}

/** Dönük minimum dikdörtgen. `angle` derece cinsindendir, CCW. */
export interface OrientedRectangle {
  /** Uzun kenarın x eksenine göre açısı (derece, CCW, [0, 180)). */
  readonly angle: number;
  /** Uzun kenar (m). */
  readonly length: number;
  /** Kısa kenar (m). */
  readonly width: number;
  /** Dikdörtgenin merkezi (yerel metrik). */
  readonly center: LocalPoint;
  /** Alan — `length × width`. */
  readonly area: number;
}

const TO_DEGREES = 180 / Math.PI;

/**
 * ASGARİ ALANLI ÇEVRELEYEN DİKDÖRTGEN.
 *
 * KESİN, yaklaşık değil. Dayandığı klasik sonuç: asgari alanlı çevreleyen
 * dikdörtgenin BİR KENARI daima dışbükey kabuğun bir kenarıyla EŞDOĞRUSALDIR.
 * Dolayısıyla kabuğun her kenarını sırayla eksen kabul edip kutuyu ölçmek
 * yeterlidir — arama, örnekleme veya optimizasyon YOKTUR.
 *
 * Bu, "açıyı 1° adımlarla tara" türü bir yaklaşımdan hem daha doğru hem
 * DETERMİNİST olduğu için tercih edildi: taramanın adım aralığı bir KOD
 * SABİTİ olurdu ve o sabiti değiştirmek, paket sürümü DONDURULMUŞ eski bir
 * projenin plan geometrisini — dolayısıyla metrajını ve maliyetini —
 * değiştirirdi (ilke 2 ihlali).
 *
 * Eşitlik bozma: alan eşitse KÜÇÜK KABUK KENARI İNDEKSİ kazanır.
 *
 * Dejenere girdide `null` döner.
 */
export function minAreaRectangle(poly: LocalPolygon): OrientedRectangle | null {
  const outer = poly.coordinates[0];
  if (!outer) return null;
  const hull = convexHull(outer);
  if (!hull) return null;

  const pts = hull.slice(0, -1);
  let best: OrientedRectangle | null = null;
  let bestIndex = -1;

  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;

    // Kenar doğrultusunda birim vektör ve dik normali.
    const ux = dx / len;
    const uy = dy / len;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of pts) {
      const rx = p[0] - a[0];
      const ry = p[1] - a[1];
      const u = rx * ux + ry * uy;
      const v = -rx * uy + ry * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }

    const extentU = maxU - minU;
    const extentV = maxV - minV;
    const area = extentU * extentV;

    // Merkez: (u,v) uzayının ortası, dünya koordinatına geri çevrilir.
    const cu = (minU + maxU) / 2;
    const cv = (minV + maxV) / 2;
    const center: LocalPoint = [a[0] + cu * ux - cv * uy, a[1] + cu * uy + cv * ux];

    // Uzun kenar hangisiyse açı ONA aittir.
    const alongIsLonger = extentU >= extentV;
    const rawAngle = Math.atan2(alongIsLonger ? uy : ux, alongIsLonger ? ux : -uy) * TO_DEGREES;
    // [0, 180)'e indirge: bir doğrultu ile 180° dönüğü aynı doğrultudur.
    const angle = ((rawAngle % 180) + 180) % 180;

    const candidate: OrientedRectangle = {
      angle,
      length: Math.max(extentU, extentV),
      width: Math.min(extentU, extentV),
      center,
      area,
    };

    // Eşitlikte küçük indeks kazanır — açık ve deterministik.
    if (best === null || candidate.area < best.area) {
      best = candidate;
      bestIndex = i;
    }
  }

  void bestIndex;
  return best;
}

/**
 * Poligonun ANA EKSENİ — dönük minimum dikdörtgenin uzun kenarı.
 *
 * `kenar` stratejisinde sirkülasyon omurgasının doğrultusu budur.
 */
export function principalAxis(poly: LocalPolygon): { angle: number; length: number } | null {
  const rect = minAreaRectangle(poly);
  if (!rect) return null;
  return { angle: rect.angle, length: rect.length };
}

/**
 * ASGARİ NET GENİŞLİK — dönük minimum dikdörtgenin kısa kenarı.
 *
 * L3'ün `minClearWidth` kontrolü ve L2'nin "aşırı dar birim" kısıtı bunu okur.
 *
 * SINIR — kaydedilen varsayım: L veya U biçimli bir mekanda bu değer ÇEVRELEYEN
 * kutunun kısa kenarıdır, dar kolun genişliği DEĞİLDİR; yani gerçek dar yerden
 * BÜYÜK çıkar. Ölçüm bu yönde hata yaptığı için ihlali GİZLEYEBİLİR, uydurma
 * bir ihlal üretmez. Gerçek dar-yer ölçümü medial eksen ister ve bu pakette yok.
 * Dikdörtgen ve yamuk hücrelerde — L3 çıktılarının ezici çoğunluğu — kesindir.
 */
export function minWidth(poly: LocalPolygon): number | null {
  const rect = minAreaRectangle(poly);
  return rect ? rect.width : null;
}

/**
 * EN-BOY ORANI — uzun kenar ÷ kısa kenar, daima ≥ 1.
 *
 * `boundingBox` tabanlı bir orandan farkı: eğik yerleşmiş uzun dar bir birim
 * eksen hizalı kutuda KARE görünür ve kısıt sessizce geçer.
 *
 * Sıfır genişlikte `null` döner — sonsuz DEĞİL. "Bilinmeyen ≠ sıfır" ile aynı
 * disiplin: dejenere geometri bir sayı değil, bir bilinmezliktir.
 */
export function aspectRatio(poly: LocalPolygon): number | null {
  const rect = minAreaRectangle(poly);
  if (!rect || rect.width === 0) return null;
  return rect.length / rect.width;
}

/**
 * DOLULUK ORANI — poligonun alanı ÷ dönük minimum dikdörtgenin alanı.
 *
 * 1'e yakınsa poligon dikdörtgene yakındır; küçükse L, U veya üçgen biçimlidir.
 * L3 şablon esnetmesinde "bu hücreye dikdörtgen bir oda oturur mu" sorusunun
 * ucuz göstergesidir.
 */
export function rectangularity(poly: LocalPolygon): number | null {
  const rect = minAreaRectangle(poly);
  if (!rect || rect.area === 0) return null;
  const outer = poly.coordinates[0];
  if (!outer) return null;
  return ringArea(outer) / rect.area;
}
