import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  aspectRatio,
  boundingBox,
  convexHull,
  minAreaRectangle,
  minWidth,
  pointInRing,
  polygon,
  principalAxis,
  rectangle,
  rectangularity,
  ringArea,
  rotatePolygon,
  type LocalPoint,
} from "@/lib/geometry";

/**
 * DIŞBÜKEY KABUK VE DÖNÜK MİNİMUM DİKDÖRTGEN.
 *
 * Bu ilkelin varlık sebebi `boundingBox`'ın YALNIZCA EKSEN HİZALI olmasıdır.
 * Aşağıdaki "eğik dikdörtgen" testleri farkın ne kadar büyük olduğunu ölçer:
 * eksen hizalı kutu, 45° dönük bir birimi KARE gibi gösterir ve "aşırı uzun
 * dar birim olmasın" kısıtı sessizce geçer.
 */

const EPS = 1e-9;

describe("convexHull", () => {
  it("dışbükey poligonun kabuğu kendisidir (aynı köşe kümesi)", () => {
    const square = rectangle(0, 0, 10, 10);
    const hull = convexHull(square.coordinates[0]!)!;
    expect(hull).not.toBeNull();
    // Kapalı halka: 4 köşe + kapanış
    expect(hull.length).toBe(5);
    const set = new Set(hull.slice(0, -1).map((p) => `${p[0]},${p[1]}`));
    expect(set).toEqual(new Set(["-5,-5", "5,-5", "5,5", "-5,5"]));
  });

  it("içbükey köşeyi ATAR", () => {
    // Ok başı: içeri girintili bir köşe var.
    const arrow = polygon([
      [
        [0, 0],
        [10, 0],
        [5, 3], // içbükey — kabukta olmamalı
        [10, 6],
        [0, 6],
        [0, 0],
      ],
    ]);
    const hull = convexHull(arrow.coordinates[0]!)!;
    const pts = hull.slice(0, -1).map((p) => `${p[0]},${p[1]}`);
    expect(pts).not.toContain("5,3");
    expect(pts.length).toBe(4);
  });

  it("eşdoğrusal ARA nokta atılır — kabuk kenar sayısı minimum kalır", () => {
    const withMidpoints = polygon([
      [
        [0, 0],
        [5, 0], // kenar ortası — eşdoğrusal
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const hull = convexHull(withMidpoints.coordinates[0]!)!;
    expect(hull.length).toBe(5); // 4 gerçek köşe + kapanış
  });

  it("kabuk SAAT YÖNÜNÜN TERSİNE sıralı", () => {
    // Girdi saat yönünde verilse bile kabuk CCW çıkmalı.
    const clockwise = polygon([
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ],
    ]);
    const hull = convexHull(clockwise.coordinates[0]!)!;
    expect(ringArea(hull)).toBeCloseTo(100, 6);
    // signedRingArea pozitifse CCW — ringArea mutlak olduğu için yönü
    // ayrıca kontrol edelim.
    const signed =
      hull.slice(0, -1).reduce((acc, p, i) => {
        const q = hull[(i + 1) % (hull.length - 1)]!;
        return acc + (p[0] * q[1] - q[0] * p[1]);
      }, 0) / 2;
    expect(signed).toBeGreaterThan(0);
  });

  it("DEJENERE girdi null döner — sıfır DEĞİL", () => {
    // Üç eşdoğrusal nokta bir alan çevrelemez.
    const line: LocalPoint[] = [
      [0, 0],
      [5, 0],
      [10, 0],
      [0, 0],
    ];
    expect(convexHull(line)).toBeNull();
  });
});

describe("minAreaRectangle", () => {
  it("eksen hizalı dikdörtgeni birebir bulur", () => {
    const rect = minAreaRectangle(rectangle(0, 0, 10, 4))!;
    expect(rect.length).toBeCloseTo(10, 9);
    expect(rect.width).toBeCloseTo(4, 9);
    expect(rect.area).toBeCloseTo(40, 9);
    expect(rect.angle).toBeCloseTo(0, 9);
    expect(rect.center[0]).toBeCloseTo(0, 9);
    expect(rect.center[1]).toBeCloseTo(0, 9);
  });

  it("EĞİK dikdörtgeni birebir bulur — `boundingBox` bulamaz", () => {
    // 30° dönük 12×3 dikdörtgen.
    const tilted = rotatePolygon(rectangle(0, 0, 12, 3), 30);

    const rect = minAreaRectangle(tilted)!;
    expect(rect.length).toBeCloseTo(12, 6);
    expect(rect.width).toBeCloseTo(3, 6);
    expect(rect.angle).toBeCloseTo(30, 6);

    // Karşılaştırma: eksen hizalı kutu ÇOK daha büyük ve oranı yanlış.
    const aabb = boundingBox(tilted);
    expect(aabb.width * aabb.height).toBeGreaterThan(rect.area * 1.5);
  });

  it("45° dönük KARE — eksen hizalı kutu %100 şişirir", () => {
    const square = rotatePolygon(rectangle(0, 0, 10, 10), 45);
    const rect = minAreaRectangle(square)!;
    expect(rect.area).toBeCloseTo(100, 6);

    const aabb = boundingBox(square);
    // Köşegen = 10√2 ≈ 14,14 → kutu alanı ≈ 200
    expect(aabb.width * aabb.height).toBeCloseTo(200, 4);
  });

  it("daima poligonu KAPSAR — alanı poligon alanından küçük olamaz", () => {
    const lShaped = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 4],
        [4, 4],
        [4, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const rect = minAreaRectangle(lShaped)!;
    expect(rect.area).toBeGreaterThanOrEqual(ringArea(lShaped.coordinates[0]!) - EPS);
  });

  it("DÖNME DEĞİŞMEZİ: poligonu θ döndürmek ölçüleri değiştirmez", () => {
    const base = polygon([
      [
        [0, 0],
        [9, 0],
        [9, 5],
        [3, 7],
        [0, 0],
      ],
    ]);
    const a = minAreaRectangle(base)!;

    for (const theta of [15, 37, 90, 123, 180]) {
      const b = minAreaRectangle(rotatePolygon(base, theta))!;
      expect(b.length).toBeCloseTo(a.length, 6);
      expect(b.width).toBeCloseTo(a.width, 6);
      expect(b.area).toBeCloseTo(a.area, 6);
      // Açı θ kadar kaymalı (mod 180).
      const expected = ((a.angle + theta) % 180 + 180) % 180;
      const diff = Math.min(
        Math.abs(b.angle - expected),
        180 - Math.abs(b.angle - expected),
      );
      expect(diff).toBeLessThan(1e-6);
    }
  });

  it("dejenere girdide null", () => {
    expect(minAreaRectangle(polygon([[[0, 0], [1, 0], [2, 0], [0, 0]]]))).toBeNull();
  });
});

describe("türetilen ölçüler", () => {
  it("principalAxis uzun kenarın doğrultusunu verir", () => {
    const axis = principalAxis(rotatePolygon(rectangle(0, 0, 20, 5), 70))!;
    expect(axis.length).toBeCloseTo(20, 6);
    expect(axis.angle).toBeCloseTo(70, 6);
  });

  it("minWidth kısa kenardır", () => {
    expect(minWidth(rotatePolygon(rectangle(0, 0, 20, 5), 70))!).toBeCloseTo(5, 6);
  });

  it("aspectRatio eğik birimde DOĞRU, eksen hizalı kutuda YANILTICI", () => {
    const tilted = rotatePolygon(rectangle(0, 0, 12, 3), 45);
    expect(aspectRatio(tilted)!).toBeCloseTo(4, 6);

    // Eksen hizalı kutu neredeyse kare görür — kısıt sessizce geçerdi.
    const aabb = boundingBox(tilted);
    const naive = Math.max(aabb.width, aabb.height) / Math.min(aabb.width, aabb.height);
    expect(naive).toBeLessThan(1.1);
  });

  it("aspectRatio dejenerede null — SONSUZ değil", () => {
    expect(aspectRatio(polygon([[[0, 0], [1, 0], [2, 0], [0, 0]]]))).toBeNull();
  });

  it("rectangularity: dikdörtgen 1, üçgen ~0,5", () => {
    expect(rectangularity(rectangle(0, 0, 8, 6))!).toBeCloseTo(1, 6);

    const triangle = polygon([
      [
        [0, 0],
        [8, 0],
        [0, 6],
        [0, 0],
      ],
    ]);
    expect(rectangularity(triangle)!).toBeCloseTo(0.5, 6);
  });
});

describe("property testleri (fast-check)", () => {
  const coord = fc.integer({ min: -50, max: 50 });

  it("kabuk GERÇEKTEN kapsar — her girdi noktası içeride veya sınırda", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(coord, coord), { minLength: 3, maxLength: 24 }), (raw) => {
        const pts = raw.map(([x, y]) => [x, y] as LocalPoint);
        const hull = convexHull([...pts, pts[0]!]);
        if (hull === null) return true; // dejenere — geçerli sonuç, hata değil

        // `pointInRing` sınırı İÇERİ sayar; kabuk köşeleri tam sınırdadır.
        for (const p of pts) {
          expect(pointInRing(p, hull), `kabuk dışında kaldı: ${p[0]},${p[1]}`).toBe(true);
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it("minAreaRectangle alanı eksen hizalı kutudan BÜYÜK olamaz", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(coord, coord), { minLength: 3, maxLength: 20 }), (raw) => {
        const pts = raw.map(([x, y]) => [x, y] as LocalPoint);
        const poly = polygon([[...pts, pts[0]!]]);
        const rect = minAreaRectangle(poly);
        if (rect === null) return true;
        const aabb = boundingBox(poly);
        // Eksen hizalı kutu ADAYLARDAN BİRİDİR (kabuk kenarı eksene paralelse),
        // dolayısıyla asgari alan ondan büyük olamaz.
        expect(rect.area).toBeLessThanOrEqual(aabb.width * aabb.height + 1e-6);
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it("uzun kenar ≥ kısa kenar — daima", () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(coord, coord), { minLength: 3, maxLength: 20 }), (raw) => {
        const pts = raw.map(([x, y]) => [x, y] as LocalPoint);
        const rect = minAreaRectangle(polygon([[...pts, pts[0]!]]));
        if (rect === null) return true;
        expect(rect.length).toBeGreaterThanOrEqual(rect.width - EPS);
        expect(rect.angle).toBeGreaterThanOrEqual(0);
        expect(rect.angle).toBeLessThan(180);
        return true;
      }),
      { numRuns: 200 },
    );
  });
});
