import { describe, expect, it } from "vitest";
import { offsetPolygon, booleanOp } from "@/lib/geometry/clipper";
import {
  multiPolygonArea,
  partCount,
  polygonArea,
  polygonPerimeter,
  ringCentroid,
  isSelfIntersecting,
  isCounterClockwise,
  normalizeRing,
} from "@/lib/geometry/measure";
import { polygon, type LocalPoint } from "@/lib/geometry/types";

/**
 * GEOMETRİ ÇEKİRDEĞİ — ölçülmüş altın değerlere karşı.
 *
 * Bu değerler clipper-lib gerçekten çalıştırılarak elde edildi ve L parselinin
 * 3 m ötelemesinde köşeler ELLE doğrulandı. Saf fonksiyonlar; veritabanı yok.
 */

/** L şeklinde parsel — içbükey. Türk kadastrosunda çok yaygın. */
const L_PARCEL: LocalPoint[] = [
  [0, 0],
  [30, 0],
  [30, 12],
  [12, 12],
  [12, 25],
  [0, 25],
];

/** U şeklinde parsel — taban kalınlığı 6 m, öteleme onu ikiye böler. */
const U_PARCEL: LocalPoint[] = [
  [0, 0],
  [30, 0],
  [30, 25],
  [22, 25],
  [22, 6],
  [8, 6],
  [8, 25],
  [0, 25],
];

const RECT_10x8: LocalPoint[] = [
  [0, 0],
  [10, 0],
  [10, 8],
  [0, 8],
];

const inward = (pts: LocalPoint[], d: number, join: "miter" | "round") =>
  offsetPolygon(polygon([pts]), -d, join);

describe("ölçüm", () => {
  it("alan ve çevre doğru", () => {
    const rect = polygon([RECT_10x8]);
    expect(polygonArea(rect)).toBeCloseTo(80, 6);
    expect(polygonPerimeter(rect)).toBeCloseTo(36, 6);

    // L parseli: 30×12 + 12×13 = 360 + 156 = 516
    expect(polygonArea(polygon([L_PARCEL]))).toBeCloseTo(516, 6);
  });

  it("sarım yönü ve normalizasyon", () => {
    expect(isCounterClockwise(RECT_10x8)).toBe(true);
    expect(isCounterClockwise([...RECT_10x8].reverse())).toBe(false);

    // Kapanış noktası tek kaynaktan eklenir, yinelenen nokta atılır
    const messy: LocalPoint[] = [[0, 0], [0, 0], [10, 0], [10, 8], [0, 8], [0, 0]];
    expect(normalizeRing(messy)).toHaveLength(5);
  });

  it("ağırlık merkezi — yerel çerçevenin origin'i", () => {
    const c = ringCentroid(RECT_10x8);
    expect(c[0]).toBeCloseTo(5, 6);
    expect(c[1]).toBeCloseTo(4, 6);
  });

  it("kendini kesen halka tespit ediliyor", () => {
    expect(isSelfIntersecting(L_PARCEL)).toBe(false);
    // Kelebek (bow-tie): geçersiz parsel sınırı
    const bowTie: LocalPoint[] = [[0, 0], [10, 10], [10, 0], [0, 10]];
    expect(isSelfIntersecting(bowTie)).toBe(true);
  });
});

describe("içe öteleme — ölçülmüş altın değerler", () => {
  it("L parseli, 3 m, miter → 1 parça, 222,00 m²", () => {
    const r = inward(L_PARCEL, 3, "miter");
    expect(partCount(r)).toBe(1);
    expect(multiPolygonArea(r)).toBeCloseTo(222.0, 2);
  });

  it("L parseli, 3 m, round → 1 parça, 223,93 m²", () => {
    const r = inward(L_PARCEL, 3, "round");
    expect(partCount(r)).toBe(1);
    // round içbükey köşedeki noktayı KORUR → miter'dan büyük alan
    expect(multiPolygonArea(r)).toBeCloseTo(223.93, 1);
  });

  it("miter ile round FARKLI sonuç verir — paket kararı bu yüzden gerekli", () => {
    const m3 = multiPolygonArea(inward(L_PARCEL, 3, "miter"));
    const r3 = multiPolygonArea(inward(L_PARCEL, 3, "round"));
    const m5 = multiPolygonArea(inward(L_PARCEL, 5, "miter"));
    const r5 = multiPolygonArea(inward(L_PARCEL, 5, "round"));

    expect(r3).toBeGreaterThan(m3);
    expect(m5).toBeCloseTo(66.0, 1);
    expect(r5).toBeCloseTo(71.37, 1);
    // 5 m çekmede fark %8'i aşıyor — kütüphane varsayılanına bırakılamaz
    expect((r5 - m5) / m5).toBeGreaterThan(0.07);
  });

  it("U parseli, 3,5 m → İKİYE BÖLÜNÜR", () => {
    const r = inward(U_PARCEL, 3.5, "miter");
    expect(partCount(r)).toBe(2);
  });

  it("U parseli, 5 m → YOK OLUR (boş sonuç, istisna değil)", () => {
    const r = inward(U_PARCEL, 5, "miter");
    expect(partCount(r)).toBe(0);
    expect(multiPolygonArea(r)).toBe(0);
  });

  it("10×8 dikdörtgen: 3 m → 8 m², 4 m → yok olur", () => {
    expect(multiPolygonArea(inward(RECT_10x8, 3, "miter"))).toBeCloseTo(8, 6);
    // 4 m'de dejenere sıfır kalınlıkta şerit kalır, atılmalı
    expect(partCount(inward(RECT_10x8, 4, "miter"))).toBe(0);
  });

  it("sarım yönü sonucu DEĞİŞTİRMEZ", () => {
    const ccw = multiPolygonArea(inward(L_PARCEL, 3, "miter"));
    const cw = multiPolygonArea(inward([...L_PARCEL].reverse(), 3, "miter"));
    expect(cw).toBeCloseTo(ccw, 6);
  });

  it("monotonluk: daha büyük çekme → daha küçük alan", () => {
    let prev = polygonArea(polygon([L_PARCEL]));
    for (const d of [1, 2, 3, 4, 5, 6]) {
      const a = multiPolygonArea(inward(L_PARCEL, d, "miter"));
      expect(a).toBeLessThanOrEqual(prev + 1e-6);
      prev = a;
    }
  });

  it("içerilme: sonuç daima parselin İÇİNDE", () => {
    const parcel = polygon([L_PARCEL]);
    for (const d of [1, 3, 5]) {
      const result = inward(L_PARCEL, d, "miter");
      const outside = booleanOp(
        result.coordinates.map((rings) => polygon(rings)),
        [parcel],
        "difference",
      );
      expect(multiPolygonArea(outside)).toBeLessThan(0.01);
    }
  });
});

describe("boolean işlemler", () => {
  it("fark (difference) çalışıyor", () => {
    const big = polygon([RECT_10x8]);
    const small = polygon([[[2, 2], [6, 2], [6, 6], [2, 6]] as LocalPoint[]]);
    const r = booleanOp([big], [small], "difference");
    expect(multiPolygonArea(r)).toBeCloseTo(80 - 16, 4);
  });

  it("delik üreten fark tek parça + delik olarak dönüyor", () => {
    const big = polygon([RECT_10x8]);
    const hole = polygon([[[3, 3], [5, 3], [5, 5], [3, 5]] as LocalPoint[]]);
    const r = booleanOp([big], [hole], "difference");
    expect(partCount(r)).toBe(1);
    expect(r.coordinates[0]).toHaveLength(2); // dış halka + 1 delik
    expect(multiPolygonArea(r)).toBeCloseTo(80 - 4, 4);
  });
});
