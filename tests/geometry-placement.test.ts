import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  boundingBox,
  containsPolygon,
  distancePointToSegment,
  distanceToRing,
  intersects,
  lShape,
  pointInPolygon,
  pointInRing,
  polygon,
  polygonArea,
  rectangle,
  rotatePolygon,
  translatePolygon,
  type LocalPolygon,
} from "@/lib/geometry";

/**
 * YERLEŞİM İLKELLERİ — İP-3 çekirdek yerleşiminin geometri tabanı.
 */

/** L şeklinde parsel, 516 m² (L0 testlerindekiyle aynı). */
const L_PARCEL: LocalPolygon = polygon([
  [
    [-15, -12.5],
    [15, -12.5],
    [15, -0.5],
    [-3, -0.5],
    [-3, 12.5],
    [-15, 12.5],
    [-15, -12.5],
  ],
]);

/** Ortasında delik olan kare: 20×20 dış, 6×6 delik. */
const WITH_HOLE: LocalPolygon = polygon([
  [
    [-10, -10],
    [10, -10],
    [10, 10],
    [-10, 10],
    [-10, -10],
  ],
  [
    [-3, -3],
    [-3, 3],
    [3, 3],
    [3, -3],
    [-3, -3],
  ],
]);

describe("sınırlayıcı kutu", () => {
  it("L parselini doğru sarıyor", () => {
    const bb = boundingBox(L_PARCEL);
    expect(bb.minX).toBe(-15);
    expect(bb.maxX).toBe(15);
    expect(bb.minY).toBe(-12.5);
    expect(bb.maxY).toBe(12.5);
    expect(bb.width).toBe(30);
    expect(bb.height).toBe(25);
  });

  it("boş poligonda sıfır", () => {
    expect(boundingBox(polygon([])).width).toBe(0);
  });
});

describe("nokta poligon içinde mi", () => {
  it("L parselinin içi ve dışı", () => {
    expect(pointInPolygon([-10, -10], L_PARCEL)).toBe(true);
    // L'nin kesilmiş köşesi — kutunun içinde ama poligonun DIŞINDA.
    expect(pointInPolygon([10, 10], L_PARCEL)).toBe(false);
    expect(pointInPolygon([100, 100], L_PARCEL)).toBe(false);
  });

  it("sınır İÇERİDE sayılıyor", () => {
    // Çekirdek köşesi zarfın kenarına tam oturursa yerleşim geçerlidir.
    expect(pointInRing([-15, 0], L_PARCEL.coordinates[0]!)).toBe(true);
    expect(pointInRing([0, -12.5], L_PARCEL.coordinates[0]!)).toBe(true);
  });

  it("delik DIŞARIDIR", () => {
    expect(pointInPolygon([0, 0], WITH_HOLE)).toBe(false);
    expect(pointInPolygon([7, 7], WITH_HOLE)).toBe(true);
  });
});

describe("mesafe", () => {
  it("doğru parçasına uzaklık — doğruya değil", () => {
    // (10,0) noktası, (0,0)-(1,0) parçasının UZANTISINDA. Doğruya uzaklık 0,
    // parçaya uzaklık 9. Kaçış mesafesi için parça doğrudur.
    expect(distancePointToSegment([10, 0], [0, 0], [1, 0])).toBeCloseTo(9, 9);
    expect(distancePointToSegment([0.5, 3], [0, 0], [1, 0])).toBeCloseTo(3, 9);
  });

  it("dejenere parça (tek nokta)", () => {
    expect(distancePointToSegment([3, 4], [0, 0], [0, 0])).toBeCloseTo(5, 9);
  });

  it("halka sınırına uzaklık içeriden de pozitif", () => {
    const square = rectangle(0, 0, 20, 20);
    expect(distanceToRing([0, 0], square.coordinates[0]!)).toBeCloseTo(10, 9);
    expect(distanceToRing([9, 0], square.coordinates[0]!)).toBeCloseTo(1, 9);
  });
});

describe("dönüşümler", () => {
  it("öteleme alanı korur", () => {
    const moved = translatePolygon(L_PARCEL, 100, -50);
    expect(polygonArea(moved)).toBeCloseTo(polygonArea(L_PARCEL), 9);
    expect(boundingBox(moved).minX).toBe(85);
  });

  it("döndürme alanı korur", () => {
    const turned = rotatePolygon(L_PARCEL, 90);
    expect(polygonArea(turned)).toBeCloseTo(polygonArea(L_PARCEL), 6);
  });

  it("360 derece döndürme başa döner", () => {
    const turned = rotatePolygon(L_PARCEL, 360);
    const original = L_PARCEL.coordinates[0]!;
    turned.coordinates[0]!.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(original[i]![0], 9);
      expect(p[1]).toBeCloseTo(original[i]![1], 9);
    });
  });

  it("delikler de öteleniyor", () => {
    const moved = translatePolygon(WITH_HOLE, 5, 5);
    expect(moved.coordinates).toHaveLength(2);
    expect(pointInPolygon([5, 5], moved)).toBe(false); // delik taşındı
  });
});

describe("basit formlar", () => {
  it("dikdörtgen alanı", () => {
    expect(polygonArea(rectangle(0, 0, 6, 4))).toBeCloseTo(24, 9);
    expect(polygonArea(rectangle(100, -50, 6, 4))).toBeCloseTo(24, 9);
  });

  it("L formu = dikdörtgen − çentik", () => {
    const l = lShape(0, 0, 10, 8, 4, 3);
    expect(polygonArea(l)).toBeCloseTo(10 * 8 - 4 * 3, 9);
  });

  it("çentik sıfırsa L bir dikdörtgendir", () => {
    expect(polygonArea(lShape(0, 0, 10, 8, 0, 0))).toBeCloseTo(80, 9);
  });
});

describe("içerilme", () => {
  it("küçük dikdörtgen L parselinin içinde", () => {
    expect(containsPolygon(L_PARCEL, rectangle(-9, -6, 6, 6))).toBe(true);
  });

  it("L'nin kesilmiş köşesine taşan dikdörtgen içeride DEĞİL", () => {
    // Köşeleri kontrol eden bir uygulama bunu kaçırabilirdi.
    expect(containsPolygon(L_PARCEL, rectangle(10, 6, 6, 6))).toBe(false);
  });

  it("KÖŞELERİ içeride ama GÖVDESİ dışarıda olan poligon yakalanıyor", () => {
    // containsPolygon'un neden nokta örneklemesi değil boolean cebri
    // kullandığının gerekçesi. Üç köşesi de L parselinin içinde olan bir
    // üçgen; (14,-12) → (-14,11) kenarı L'nin kesilmiş köşesinden geçiyor.
    const triangle = polygon([
      [
        [14, -12],
        [-14, 11],
        [-14, -12],
        [14, -12],
      ],
    ]);

    const corners = triangle.coordinates[0]!.slice(0, 3);
    expect(corners.every((c) => pointInPolygon(c, L_PARCEL))).toBe(true);

    // Köşe kontrolü "içeride" derdi; gerçek şu ki değil.
    expect(containsPolygon(L_PARCEL, triangle)).toBe(false);
  });

  it("kendisini içerir", () => {
    expect(containsPolygon(L_PARCEL, L_PARCEL)).toBe(true);
  });

  it("boş poligon içerilmiş sayılmaz", () => {
    expect(containsPolygon(L_PARCEL, rectangle(0, 0, 0, 0))).toBe(false);
  });
});

describe("kesişim", () => {
  it("ayrık poligonlar kesişmiyor", () => {
    expect(intersects(rectangle(0, 0, 2, 2), rectangle(10, 10, 2, 2))).toBe(false);
  });

  it("örtüşen poligonlar kesişiyor", () => {
    expect(intersects(rectangle(0, 0, 4, 4), rectangle(2, 2, 4, 4))).toBe(true);
  });

  it("yalnızca köşede değen poligonlar kesişmiyor (alan yok)", () => {
    expect(intersects(rectangle(0, 0, 2, 2), rectangle(2, 2, 2, 2))).toBe(false);
  });
});

describe("özellik testleri", () => {
  it("dikdörtgenin merkezi daima içinde", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: 0.1, max: 40, noNaN: true }),
        fc.double({ min: 0.1, max: 40, noNaN: true }),
        (cx, cy, w, h) => {
          expect(pointInPolygon([cx, cy], rectangle(cx, cy, w, h))).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("ötelenen dikdörtgen ötelenen kutunun içinde kalır", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100, max: 100, noNaN: true }),
        fc.double({ min: -100, max: 100, noNaN: true }),
        (dx, dy) => {
          const outer = translatePolygon(rectangle(0, 0, 20, 20), dx, dy);
          const inner = translatePolygon(rectangle(0, 0, 4, 4), dx, dy);
          expect(containsPolygon(outer, inner)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
