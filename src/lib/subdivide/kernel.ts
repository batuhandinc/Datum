import {
  SCALE,
  booleanOp,
  multiPolygonArea,
  polygon,
  multiPolygon,
  ringPerimeter,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";

/**
 * BÖLME ÇEKİRDEĞİ — L2 ve L3'ün ORTAK motoru.
 *
 * SAF: Prisma/Next yok. Tarayıcı ve sunucu aynı dosya.
 *
 * TEK İŞ YAPAR: bir bölgeyi, hedef alanı tutturan bir yerden ikiye keser.
 * L2 bunu birimlere, L3 mekanlara uygular; fark yalnızca hangi SÜPÜRME
 * ailesinin verildiğidir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TOPOLOJİ KARARI ÇEKİRDEĞE AİT DEĞİLDİR.
 *
 * Kesim, içbükey bir bölgede AYRIK parçalar üretebilir — ve L2'nin çıktısı
 * çekirdek etrafında sıkça L biçimli olduğu için bu istisna değil, olağandır.
 * Çekirdek bu yüzden `LocalMultiPolygon` döndürür ve "hangi parça birimindir"
 * sorusunu ÇAĞIRANA bırakır.
 *
 * Alternatif — çekirdeğin içinde "en büyük parçayı al" demek — iki kötü
 * sonuçtan birini üretirdi: ya atılan alan sessizce buharlaşır (hiçbir m²
 * kaybolmaz iddiası çöker), ya da iki kopuk lekeden oluşan bir "daire"
 * doğar (ilke 4: geometri serbest, NESNE ANLAMLI). Karar, atılan alanı
 * raporlayabilecek olan yerde — çağıranda — verilmelidir.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * DETERMİNİZM. Sabit yineleme tavanı, saat yok, rastgelelik yok, tolerans
 * clipper ızgarasından TÜRETİLİR (sihirli sayı değil).
 *
 * KARAR ALANLA VERİLİR, UZUNLUKLA DEĞİL. Alan yalnızca çarpma ve toplamadan
 * çıkar; IEEE-754 bu iki işlemi TAM olarak belirtir, yani karşılaştırma her
 * platformda aynı sonucu verir. `Math.sqrt` ve `Math.hypot` ise ECMA-262'de
 * "implementation-approximated"tır. Bu yüzden çekirdeğin karar veren tek
 * karşılaştırması `alan < hedef`tir; uzunluklar yalnızca RAPORLANIR.
 */

/**
 * Süpürme ailesi: parametreye göre BÜYÜYEN kesiciler.
 *
 * Sözleşme — `cutByArea`'nın ikili araması buna dayanır:
 *   t₁ < t₂  ⇒  cutter(t₁) ⊆ cutter(t₂)     (yuvalı)
 * Bu sağlanmazsa alan monoton olmaz ve arama anlamsızlaşır.
 *
 * Parametre daima METRE cinsindendir — doğrusal süpürmede uzanım, kama
 * süpürmesinde YAY UZUNLUĞU. Kamanın ham açıyla parametrelenmesi yaygın bir
 * hatadır: durma toleransı o zaman radyan olur ve 60 m yarıçapta 1e-3 rad
 * 6 cm yer değiştirme demektir; korkuluk boyut olarak yanlış olur.
 */
export interface Sweep {
  readonly kind: "linear" | "wedge";
  /** Parametrenin alt sınırı (m) — burada kesici bölgeyle kesişmez. */
  readonly min: number;
  /** Parametrenin üst sınırı (m) — burada kesici bölgeyi tamamen kapsar. */
  readonly max: number;
  /** Parametre → kesici poligon. Yuvalı olmak ZORUNDA. */
  cutter(t: number): LocalPolygon;
}

export interface CutResult {
  /** Hedefe en yakın parça. AYRIK olabilir — karar çağıranındır. */
  readonly piece: LocalMultiPolygon;
  /** Geriye kalan. */
  readonly rest: LocalMultiPolygon;
  /** Parçanın gerçekleşen alanı (m²). */
  readonly achievedArea: number;
  /** Süpürme parametresinin durduğu yer (m). */
  readonly at: number;
  /**
   * Hedefe ULAŞILABİLDİ mi?
   *
   * `false` ise bölgenin tamamı hedeften küçüktür — yani hedef bu bölgede
   * karşılanamaz. Çağıran bunu bir UYARIYA çevirmeli, sessizce geçmemeli:
   * aksi halde kuyruktaki birimler sıfır alanlı dilim alır, kılcal olarak
   * atılır ve arıza "artık atıldı" diye yanlış teşhis edilir.
   */
  readonly converged: boolean;
}

/**
 * İkili aramanın durma çözünürlüğü (metre).
 *
 * SİHİRLİ SAYI DEĞİL: clipper tüm koordinatları `SCALE` (=1000) ile çarpıp
 * yuvarlar, yani milimetre ızgarasında çalışır. Parametre aralığı bir ızgara
 * biriminin altına indiğinde kesici poligon ARTIK DEĞİŞMEZ; devam etmek aynı
 * boolean işlemini tekrarlamaktan ibarettir.
 */
const SWEEP_RESOLUTION = 1 / SCALE;

/**
 * Yineleme tavanı — algoritmik korkuluk.
 *
 * 2^40 × 1 mm ≈ 1,1 milyar metre; hiçbir parselde ulaşılamaz. Sonsuz döngüye
 * karşı bir emniyet supabıdır, bir kalite ayarı değildir.
 */
const MAX_ITERATIONS = 40;

/** MultiPolygon'u boolean işlemlerinin beklediği poligon dizisine çevirir. */
export function toPolygons(mp: LocalMultiPolygon): LocalPolygon[] {
  return mp.coordinates.map((rings) => polygon(rings));
}

/**
 * ALAN ÖLÇÜMÜNÜN KUANTALAMA SINIRI (m²).
 *
 * clipper her köşeyi milimetre ızgarasına yuvarlar. Kayma köşe başına en çok
 * bir ızgara birimidir ve alan hatasına çevre boyunca yayılır; üst sınır
 * `çevre × ızgara`dır. EKSEN HİZALI bir poligonda hata sıfırdır (köşeler
 * zaten ızgarada), EĞİK bir poligonda sınıra yaklaşır — ve `Parcel.rotation`
 * yorumunun dediği gibi gerçek parseller eğiktir.
 *
 * ÇAĞIRAN BUNU KULLANMALIDIR. `UnitLayoutRule.areaTolerance` ile karşılaştırma
 * yaparken bu sınırın altındaki sapma GERÇEK DEĞİLDİR; yok sayılmazsa her
 * kesim sahte bir "hedef alan tutmadı" uyarısı üretir ve gerçek sapma
 * gürültünün içinde kaybolur.
 */
export function areaQuantizationBound(mp: LocalMultiPolygon): number {
  let perimeter = 0;
  for (const rings of mp.coordinates) {
    for (const ring of rings) perimeter += ringPerimeter(ring);
  }
  return perimeter / SCALE;
}

/** Tek poligonu MultiPolygon'a sarar. */
export function asMultiPolygon(poly: LocalPolygon): LocalMultiPolygon {
  return multiPolygon([poly.coordinates]);
}

/**
 * Bölgeyi hedef alanı tutturan yerden keser.
 *
 * Hedef bölgenin tamamından büyükse bölgenin TAMAMI `piece` olur, `rest` boş
 * kalır ve `converged: false` döner — sessiz bir sıfır dilim ÜRETİLMEZ.
 */
export function cutByArea(
  region: LocalMultiPolygon,
  sweep: Sweep,
  targetArea: number,
): CutResult {
  const total = multiPolygonArea(region);
  const parts = toPolygons(region);

  const areaAt = (t: number): number =>
    multiPolygonArea(booleanOp(parts, [sweep.cutter(t)], "intersection"));

  // Hedef bölgeye sığmıyor: tamamını ver ve AÇIKÇA yakınsamadığını söyle.
  if (targetArea >= total) {
    return {
      piece: region,
      rest: multiPolygon([]),
      achievedArea: total,
      at: sweep.max,
      converged: false,
    };
  }

  let lo = sweep.min;
  let hi = sweep.max;
  for (let i = 0; i < MAX_ITERATIONS && hi - lo > SWEEP_RESOLUTION; i += 1) {
    const mid = (lo + hi) / 2;
    // TEK karar veren karşılaştırma — ve alan üzerinde, uzunluk üzerinde değil.
    if (areaAt(mid) < targetArea) lo = mid;
    else hi = mid;
  }

  const at = hi;
  const cutter = sweep.cutter(at);
  const piece = booleanOp(parts, [cutter], "intersection");
  const rest = booleanOp(parts, [cutter], "difference");

  return {
    piece,
    rest,
    achievedArea: multiPolygonArea(piece),
    at,
    converged: true,
  };
}

// ---------------------------------------------------------------------------
// Süpürme aileleri
// ---------------------------------------------------------------------------

/** Kesicinin bölgeyi kesin kapsaması için uzanıma eklenen pay (m). */
const COVER_MARGIN = 1;

/**
 * DOĞRUSAL SÜPÜRME — `kenar` stratejisi ve L3'ün hücre bölmeleri.
 *
 * `angleDegrees` yönünde ilerleyen bir yarı düzlem. Kesici, döndürülmüş
 * çerçevede kocaman bir dikdörtgen olarak kurulur; yarı düzlemi doğrudan
 * temsil edecek bir tip olmadığı için (clipper sınırlı poligonlarla çalışır).
 */
export function linearSweep(region: LocalMultiPolygon, angleDegrees: number): Sweep {
  const rad = (angleDegrees * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const rings of region.coordinates) {
    for (const p of rings[0] ?? []) {
      const u = p[0] * ux + p[1] * uy;
      const v = -p[0] * uy + p[1] * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }

  if (!Number.isFinite(minU)) {
    // Boş bölge — süpürme tanımsız; sabit boş kesici döndür.
    const empty = polygon([]);
    return { kind: "linear", min: 0, max: 0, cutter: () => empty };
  }

  const v0 = minV - COVER_MARGIN;
  const v1 = maxV + COVER_MARGIN;
  const u0 = minU - COVER_MARGIN;

  const toWorld = (u: number, v: number): LocalPoint => [u * ux - v * uy, u * uy + v * ux];

  return {
    kind: "linear",
    min: 0,
    max: maxU - minU + 2 * COVER_MARGIN,
    cutter(t: number): LocalPolygon {
      const u1 = u0 + t;
      return polygon([
        [toWorld(u0, v0), toWorld(u1, v0), toWorld(u1, v1), toWorld(u0, v1), toWorld(u0, v0)],
      ]);
    },
  };
}

/** Kama süpürmesinde yayın açısal adımı (derece) — kesicinin kapsamasını garanti eder. */
const WEDGE_STEP_DEGREES = 5;

/**
 * KAMA SÜPÜRMESİ — `merkezi` strateji.
 *
 * Çekirdek ağırlık merkezinden çıkan ışınlar; her dilim hem çekirdeğe (iç uç)
 * hem cepheye (dış uç) değer. Böylece iki sert kısıt — çekirdeğe erişim ve
 * cephe — bir KONTROL değil, çözümün TANIMI olur.
 *
 * Parametre YAY UZUNLUĞUDUR (metre), ham açı değil: durma toleransı o zaman
 * doğrusal süpürmeyle aynı birimde olur ve yarıçaptan bağımsızlaşır.
 *
 * Yarıçap, bölgenin en uzak noktasının İKİ KATI alınır ve yay 5°'lik kirişlerle
 * örnekleneir. Kirişin apex'e uzaklığı `2R·cos(2,5°) ≈ 1,998·R` olduğundan
 * bölge her koşulda kesicinin İÇİNDE kalır — yay yaklaşımı alan hatası ÜRETMEZ.
 */
export function wedgeSweep(
  region: LocalMultiPolygon,
  apex: LocalPoint,
  startAngleDegrees: number,
): Sweep {
  let maxDist = 0;
  for (const rings of region.coordinates) {
    for (const p of rings[0] ?? []) {
      const d = Math.hypot(p[0] - apex[0], p[1] - apex[1]);
      if (d > maxDist) maxDist = d;
    }
  }

  if (maxDist === 0) {
    const empty = polygon([]);
    return { kind: "wedge", min: 0, max: 0, cutter: () => empty };
  }

  const radius = 2 * maxDist;
  const start = (startAngleDegrees * Math.PI) / 180;
  const step = (WEDGE_STEP_DEGREES * Math.PI) / 180;

  return {
    kind: "wedge",
    min: 0,
    // Tam tur: yay uzunluğu 2πR.
    max: 2 * Math.PI * radius,
    cutter(t: number): LocalPolygon {
      const sweptAngle = Math.min(t / radius, 2 * Math.PI);
      if (sweptAngle <= 0) return polygon([]);

      const ring: LocalPoint[] = [apex];
      const steps = Math.max(1, Math.ceil(sweptAngle / step));
      for (let i = 0; i <= steps; i += 1) {
        const a = start + (sweptAngle * i) / steps;
        ring.push([apex[0] + radius * Math.cos(a), apex[1] + radius * Math.sin(a)]);
      }
      ring.push(apex);
      return polygon([ring]);
    },
  };
}
