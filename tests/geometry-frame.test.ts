import { describe, expect, it } from "vitest";
import {
  localToWgs84,
  ringFromProjectedGrid,
  ringFromWgs84,
  wgs84ToLocal,
  type LocalFrame,
} from "@/lib/geometry/frame";
import { ringArea, ringCentroid } from "@/lib/geometry/measure";
import type { LocalPoint } from "@/lib/geometry/types";

/**
 * YEREL TEĞET DÜZLEM.
 *
 * Türkiye enlem aralığı ~36°–42°. Testler bu bandı tarar.
 */

const TR_LATITUDES = [36, 39, 42];

/** Yerel metrede kenarı `size` olan kare. */
const square = (size: number): LocalPoint[] => [
  [-size / 2, -size / 2],
  [size / 2, -size / 2],
  [size / 2, size / 2],
  [-size / 2, size / 2],
];

describe("gidiş-dönüş doğruluğu", () => {
  it.each(TR_LATITUDES)("%d° enlemde nokta gidiş-dönüşü < 1 mm", (lat) => {
    const frame: LocalFrame = { centerLatitude: lat, centerLongitude: 32, rotation: 0 };
    for (const p of square(400)) {
      const [lon, la] = localToWgs84(p, frame);
      const back = wgs84ToLocal(lon, la, frame);
      expect(Math.hypot(back[0] - p[0], back[1] - p[1])).toBeLessThan(0.001);
    }
  });

  it.each(TR_LATITUDES)("%d° enlemde 200 m karenin ALANI korunuyor", (lat) => {
    const frame: LocalFrame = { centerLatitude: lat, centerLongitude: 32, rotation: 0 };
    const local = square(200);
    const lonLat = local.map((p) => localToWgs84(p, frame));

    const { ring } = ringFromWgs84(lonLat);
    // 40.000 m²; kabul edilen sapma 1 cm² mertebesinde
    expect(ringArea(ring)).toBeCloseTo(40_000, 2);
  });
});

describe("naif küre KULLANILMIYOR — gerekçesi ölçülebilir", () => {
  /** Yaygın "equirectangular" kestirmesi: tek yarıçap, elipsoit yok. */
  const NAIVE_R = 6_371_000;
  const DEG = Math.PI / 180;

  it.each(TR_LATITUDES)("%d° enlemde naif küre alanı belirgin şekilde kaydırıyor", (lat) => {
    const frame: LocalFrame = { centerLatitude: lat, centerLongitude: 32, rotation: 0 };
    const local = square(200);
    const lonLat = local.map((p) => localToWgs84(p, frame));

    // Aynı lon/lat'ı naif küreyle yerelleştir
    const naive = lonLat.map(([lon, la]) => [
      NAIVE_R * Math.cos(lat * DEG) * (lon - frame.centerLongitude) * DEG,
      NAIVE_R * (la - frame.centerLatitude) * DEG,
    ] as LocalPoint);

    const err = Math.abs(ringArea(naive) - 40_000);
    // Elipsoidal yol cm² mertebesinde; naif küre m² mertebesinde sapıyor.
    // Bu, 4000 m²'lik bir parselde emsal/TAKS hesabını bozacak büyüklüktür.
    expect(err).toBeGreaterThan(1);
  });
});

describe("çerçeve üretimi", () => {
  it("origin parselin ağırlık merkezi oluyor", () => {
    const frame: LocalFrame = { centerLatitude: 39, centerLongitude: 32.5, rotation: 0 };
    // Merkezden kaydırılmış bir kare
    const shifted = square(100).map((p) => [p[0] + 300, p[1] - 150] as LocalPoint);
    const lonLat = shifted.map((p) => localToWgs84(p, frame));

    const { ring, frame: derived } = ringFromWgs84(lonLat);

    // Yeni çerçevede ağırlık merkezi origin'de olmalı
    const c = ringCentroid(ring);
    expect(Math.hypot(c[0], c[1])).toBeLessThan(0.01);
    // Türetilen merkez, kaydırılmış karenin gerçek merkezine yakın olmalı
    const [expLon, expLat] = localToWgs84([300, -150], frame);
    expect(derived.centerLongitude).toBeCloseTo(expLon, 6);
    expect(derived.centerLatitude).toBeCloseTo(expLat, 6);
  });

  it("boş girdi patlamıyor", () => {
    const { ring } = ringFromWgs84([]);
    expect(ring).toHaveLength(0);
  });
});

describe("projekte grid — dönüşüm YOK, yalnızca yerelleştirme", () => {
  it("ham TUREF/TM koordinatı ağırlık merkezine ötelenir, ölçek korunur", () => {
    // Gerçekçi TM30 değerleri: x≈500.000, y≈4.400.000
    const grid: [number, number][] = [
      [500_000, 4_400_000],
      [500_200, 4_400_000],
      [500_200, 4_400_150],
      [500_000, 4_400_150],
    ];
    const { ring, origin } = ringFromProjectedGrid(grid);

    // Alan grid'de neyse yerelde de odur — projeksiyon dönüşümü yapılmadı
    expect(ringArea(ring)).toBeCloseTo(200 * 150, 6);

    // Origin gerçek merkez
    expect(origin[0]).toBeCloseTo(500_100, 6);
    expect(origin[1]).toBeCloseTo(4_400_075, 6);

    // Koordinatlar artık küçük — Clipper'ın hızlı 64-bit aralığında
    for (const p of ring) {
      expect(Math.abs(p[0])).toBeLessThan(1000);
      expect(Math.abs(p[1])).toBeLessThan(1000);
    }
  });
});
