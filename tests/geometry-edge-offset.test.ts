import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  offsetByEdge,
  offsetByEdgeMiter,
  offsetByEdgeRound,
  offsetUniform,
} from "@/lib/geometry/offset";
import { booleanOp } from "@/lib/geometry/clipper";
import { multiPolygonArea, partCount, polygonArea, ringArea } from "@/lib/geometry/measure";
import { polygon, type LocalPoint } from "@/lib/geometry/types";

/**
 * KENAR BAZINDA ÖTELEME.
 *
 * Hiçbir hazır kütüphane bunu desteklemiyor; kendi uygulamamız test edilmeli.
 * En güçlü test DİFERANSİYELDİR: tüm çekmeler eşitken kenar bazlı algoritma,
 * Clipper'ın savaş görmüş uniform ötelemesiyle AYNI sonucu vermelidir.
 */

const L_PARCEL: LocalPoint[] = [
  [0, 0],
  [30, 0],
  [30, 12],
  [12, 12],
  [12, 25],
  [0, 25],
];

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

const uniformDistances = (n: number, d: number) => new Array<number>(n).fill(d);

describe("diferansiyel: kenar bazlı ≡ uniform (tüm çekmeler eşitken)", () => {
  // Bu, elle yazılmış algoritmanın tek en güçlü doğrulamasıdır.
  it.each([1, 2, 3, 4, 5])("L parseli, %d m — miter", (d) => {
    const poly = polygon([L_PARCEL]);
    const byEdge = offsetByEdgeMiter(poly, uniformDistances(L_PARCEL.length, d));
    const uniform = offsetUniform(poly, d, "miter");

    expect(partCount(byEdge)).toBe(partCount(uniform));
    expect(multiPolygonArea(byEdge)).toBeCloseTo(multiPolygonArea(uniform), 3);
  });

  it.each([1, 2, 3])("U parseli, %d m — miter", (d) => {
    const poly = polygon([U_PARCEL]);
    const byEdge = offsetByEdgeMiter(poly, uniformDistances(U_PARCEL.length, d));
    const uniform = offsetUniform(poly, d, "miter");
    expect(multiPolygonArea(byEdge)).toBeCloseTo(multiPolygonArea(uniform), 3);
  });

  it.each([1, 3, 5])("L parseli, %d m — round (kapsül farkı)", (d) => {
    const poly = polygon([L_PARCEL]);
    const byEdge = offsetByEdgeRound(poly, uniformDistances(L_PARCEL.length, d));
    const uniform = offsetUniform(poly, d, "round");
    // Kapsül yay ayrıklaştırması ile Clipper'ın round join'i mm düzeyinde ayrışır
    expect(multiPolygonArea(byEdge)).toBeCloseTo(multiPolygonArea(uniform), 1);
  });
});

describe("değişken çekme mesafeleri", () => {
  it("L parseli, ön 5 / yan 3 / arka 3 — ön kenar gerçekten 5 m içeride", () => {
    // Kenar 0 = [0,0] → [30,0], yani alt kenar "ön".
    const distances = [5, 3, 3, 3, 3, 3];
    const r = offsetByEdgeMiter(polygon([L_PARCEL]), distances);

    expect(partCount(r)).toBe(1);
    const ring = r.coordinates[0]![0]!;
    const ys = ring.map((p) => p[1]);
    // Ön kenar 5 m içeride → en küçük y = 5 (3 değil)
    expect(Math.min(...ys)).toBeCloseTo(5, 3);
    // Diğer kenarlar 3 m → sol sınır x = 3
    const xs = ring.map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(3, 3);
  });

  it("ön çekmeyi büyütmek alanı KÜÇÜLTÜR", () => {
    const poly = polygon([L_PARCEL]);
    const a3 = multiPolygonArea(offsetByEdgeMiter(poly, [3, 3, 3, 3, 3, 3]));
    const a5 = multiPolygonArea(offsetByEdgeMiter(poly, [5, 3, 3, 3, 3, 3]));
    expect(a5).toBeLessThan(a3);
  });

  it("sıfır çekme = öteleme yok", () => {
    const poly = polygon([L_PARCEL]);
    const r = offsetByEdge({ polygon: poly, setbacks: [], joinType: "miter" });
    expect(multiPolygonArea(r)).toBeCloseTo(polygonArea(poly), 6);
  });

  it("aralık dışı kenar indeksi sessizce yok sayılır, patlamaz", () => {
    const poly = polygon([L_PARCEL]);
    const r = offsetByEdge({
      polygon: poly,
      setbacks: [{ edgeIndex: 99, distance: 5 }],
      joinType: "miter",
    });
    expect(multiPolygonArea(r)).toBeCloseTo(polygonArea(poly), 6);
  });
});

describe("patolojik durumlar", () => {
  it("büyük çekme parseli YOK EDER — istisna değil, boş sonuç", () => {
    const r = offsetByEdgeMiter(polygon([L_PARCEL]), uniformDistances(6, 20));
    expect(partCount(r)).toBe(0);
    expect(multiPolygonArea(r)).toBe(0);
  });

  it("U parselinde değişken çekme bölünme üretebilir", () => {
    const r = offsetByEdgeMiter(polygon([U_PARCEL]), [3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5]);
    expect(partCount(r)).toBe(2);
  });

  it("sivri köşede miter limiti negatif alan ÜRETMİYOR", () => {
    // Çok dar bir kama — miter limiti olmadan uzantı patlar
    const wedge: LocalPoint[] = [[0, 0], [60, 1], [60, -1]];
    const r = offsetByEdgeMiter(polygon([wedge]), [0.5, 0.5, 0.5]);
    for (const rings of r.coordinates) {
      expect(ringArea(rings[0]!)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("property testleri (fast-check)", () => {
  /** Rastgele yıldız-şekilli poligon — basit (kendini kesmeyen) garantili. */
  const starPolygon = fc
    .array(fc.double({ min: 5, max: 40, noNaN: true }), { minLength: 5, maxLength: 10 })
    .map((radii) => {
      const n = radii.length;
      return radii.map((r, i) => {
        const a = (2 * Math.PI * i) / n;
        return [
          Math.round(Math.cos(a) * r * 1000) / 1000,
          Math.round(Math.sin(a) * r * 1000) / 1000,
        ] as LocalPoint;
      });
    });

  it("kenar bazlı ≡ uniform, rastgele poligonlarda", () => {
    fc.assert(
      fc.property(starPolygon, fc.double({ min: 0.5, max: 3, noNaN: true }), (pts, d) => {
        const poly = polygon([pts]);
        const byEdge = offsetByEdgeMiter(poly, uniformDistances(pts.length, d));
        const uniform = offsetUniform(poly, d, "miter");
        const a = multiPolygonArea(byEdge);
        const b = multiPolygonArea(uniform);
        // Alanların ikisi de ~0 ise mutlak, değilse göreli karşılaştır
        if (Math.max(a, b) < 1) return Math.abs(a - b) < 0.1;
        return Math.abs(a - b) / Math.max(a, b) < 0.02;
      }),
      { numRuns: 200 },
    );
  });

  it("hiçbir dış halka NEGATİF alanlı değil", () => {
    fc.assert(
      fc.property(starPolygon, fc.double({ min: 0.5, max: 5, noNaN: true }), (pts, d) => {
        const r = offsetByEdgeMiter(polygon([pts]), uniformDistances(pts.length, d));
        return r.coordinates.every((rings) => ringArea(rings[0]!) >= 0);
      }),
      { numRuns: 200 },
    );
  });

  it("içerilme: sonuç daima parselin İÇİNDE", () => {
    fc.assert(
      fc.property(starPolygon, fc.double({ min: 0.5, max: 4, noNaN: true }), (pts, d) => {
        const poly = polygon([pts]);
        const r = offsetByEdgeMiter(poly, uniformDistances(pts.length, d));
        if (partCount(r) === 0) return true;
        const outside = booleanOp(
          r.coordinates.map((rings) => polygon(rings)),
          [poly],
          "difference",
        );
        // Milimetre kuantizasyonu kadar tolerans
        return multiPolygonArea(outside) < 0.05;
      }),
      { numRuns: 200 },
    );
  });

  it("monotonluk: daha büyük çekme → daha küçük alan", () => {
    fc.assert(
      fc.property(starPolygon, (pts) => {
        let prev = Infinity;
        for (const d of [0.5, 1.5, 2.5, 3.5]) {
          const a = multiPolygonArea(offsetByEdgeMiter(polygon([pts]), uniformDistances(pts.length, d)));
          if (a > prev + 0.05) return false;
          prev = a;
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });
});
