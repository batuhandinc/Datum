import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  multiPolygonArea,
  polygon,
  rectangle,
  rotatePolygon,
  type LocalPoint,
} from "@/lib/geometry";
import {
  areaQuantizationBound,
  asMultiPolygon,
  cutByArea,
  linearSweep,
  wedgeSweep,
} from "@/lib/subdivide/kernel";
import {
  COLLINEAR_TOLERANCE,
  contactLength,
  outerSegments,
  segmentLength,
  sharedBoundaryRuns,
  totalLength,
  touches,
} from "@/lib/subdivide/boundary";

/**
 * BÖLME ÇEKİRDEĞİ — L2 ve L3'ün ortak motoru.
 *
 * En kritik testler alan KORUNUMU ve YAKINSAMAMA davranışıdır: hedefe
 * ulaşılamadığında sessiz bir sıfır dilim üretilmemeli, `converged: false`
 * dönmeli. Panel hakemlerinin ortak bulgusu buydu.
 */

/**
 * Alan karşılaştırmalarının toleransı SİHİRLİ SAYI DEĞİL: clipper'ın mm
 * ızgarasından türeyen kuantalama sınırıdır (`çevre × ızgara`). Eksen hizalı
 * poligonda hata sıfırdır; EĞİK poligonda sınıra yaklaşır. Testin bu sınırın
 * altına inmesi, kodu değil testi yanlış yapar.
 */
const bound = (mp: Parameters<typeof areaQuantizationBound>[0]) => areaQuantizationBound(mp);

describe("cutByArea — doğrusal süpürme", () => {
  const plate = asMultiPolygon(rectangle(0, 0, 20, 10)); // 200 m²

  it("hedef alanı tutturur", () => {
    const cut = cutByArea(plate, linearSweep(plate, 0), 60);
    expect(cut.converged).toBe(true);
    expect(cut.achievedArea).toBeCloseTo(60, 2);
  });

  it("ALAN KORUNUR: parça + kalan = bütün", () => {
    const cut = cutByArea(plate, linearSweep(plate, 0), 73.5);
    const sum = multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest);
    expect(sum).toBeCloseTo(200, 2);
  });

  it("eğik süpürme de hedefi tutturur ve alanı korur", () => {
    const cut = cutByArea(plate, linearSweep(plate, 37), 88);
    // Eğik kesim mm ızgarasında kuantalanır; sapma kuantalama sınırının altında.
    expect(Math.abs(cut.achievedArea - 88)).toBeLessThan(bound(plate));
    expect(Math.abs(multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest) - 200)).toBeLessThan(
      bound(plate),
    );
  });

  it("HEDEF SIĞMIYORSA converged:false — sessiz sıfır dilim YOK", () => {
    const cut = cutByArea(plate, linearSweep(plate, 0), 500);
    expect(cut.converged).toBe(false);
    // Tamamı verilir, kalan boştur — kaybolan alan yok.
    expect(cut.achievedArea).toBeCloseTo(200, 6);
    expect(multiPolygonArea(cut.rest)).toBeCloseTo(0, 6);
  });

  it("hedef tam bölge alanına eşitse de converged:false", () => {
    const cut = cutByArea(plate, linearSweep(plate, 0), 200);
    expect(cut.converged).toBe(false);
  });

  it("DETERMİNİST: aynı girdi iki kez → birebir aynı sonuç", () => {
    const a = cutByArea(plate, linearSweep(plate, 23), 61.25);
    const b = cutByArea(plate, linearSweep(plate, 23), 61.25);
    expect(a.at).toBe(b.at);
    expect(a.achievedArea).toBe(b.achievedArea);
    expect(JSON.stringify(a.piece)).toBe(JSON.stringify(b.piece));
  });
});

describe("cutByArea — içbükey bölge ve TOPOLOJİ", () => {
  // L biçimli plaka: çekirdek etrafındaki kalan alanın tipik biçimi.
  const lShape = asMultiPolygon(
    polygon([
      [
        [0, 0],
        [20, 0],
        [20, 8],
        [8, 8],
        [8, 20],
        [0, 20],
        [0, 0],
      ],
    ]),
  );

  it("kesim AYRIK parça üretebilir ve çekirdek bunu GİZLEMEZ", () => {
    // L'nin iki kolunu ortadan kesen bir süpürme, dilimi ikiye ayırabilir.
    const total = multiPolygonArea(lShape);
    const cut = cutByArea(lShape, linearSweep(lShape, 90), total * 0.5);

    // Çekirdek MultiPolygon döndürür; parça sayısını çağıran görebilmeli.
    expect(cut.piece.type).toBe("MultiPolygon");
    // Alan yine korunur — hangi parçanın kime ait olduğu çağıranın kararı.
    expect(multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest)).toBeCloseTo(total, 2);
  });

  it("içbükey bölgede de hedefi tutturur", () => {
    const cut = cutByArea(lShape, linearSweep(lShape, 0), 100);
    expect(cut.converged).toBe(true);
    expect(cut.achievedArea).toBeCloseTo(100, 2);
  });
});

describe("cutByArea — kama süpürmesi", () => {
  const plate = asMultiPolygon(rectangle(0, 0, 30, 20)); // 600 m²
  const apex: LocalPoint = [0, 0];

  it("kama hedefi tutturur", () => {
    const cut = cutByArea(plate, wedgeSweep(plate, apex, 0), 150);
    expect(cut.converged).toBe(true);
    expect(cut.achievedArea).toBeCloseTo(150, 2);
  });

  it("YAY UZUNLUĞUYLA parametrelenir — parametre metre, radyan DEĞİL", () => {
    const sweep = wedgeSweep(plate, apex, 0);
    // Tam tur = 2πR; R = 2 × en uzak nokta. En uzak köşe (15,10) → 18,03 m.
    const maxDist = Math.hypot(15, 10);
    expect(sweep.max).toBeCloseTo(2 * Math.PI * 2 * maxDist, 6);
    // Metre mertebesinde: yüzlerce, radyan olsaydı 6,28 olurdu.
    expect(sweep.max).toBeGreaterThan(100);
  });

  it("dilim apex'e DEĞER — çekirdek erişimi çözümün tanımıdır", () => {
    const cut = cutByArea(plate, wedgeSweep(plate, apex, 0), 120);
    const first = cut.piece.coordinates[0];
    expect(first).toBeDefined();
    // Apex kamanın köşesidir; dilimin sınırı ondan geçmeli.
    const hasApex = first!.some((ring) =>
      ring.some((p) => Math.hypot(p[0] - apex[0], p[1] - apex[1]) < 1e-6),
    );
    expect(hasApex).toBe(true);
  });

  it("ALAN KORUNUR", () => {
    const cut = cutByArea(plate, wedgeSweep(plate, apex, 0), 200);
    expect(multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest)).toBeCloseTo(600, 1);
  });
});

describe("ortak sınır algebrası", () => {
  it("bitişik iki dikdörtgenin ortak kenarını bulur", () => {
    const left = rectangle(-5, 0, 10, 8); // x ∈ [-10, 0]
    const right = rectangle(5, 0, 10, 8); // x ∈ [0, 10]
    const runs = sharedBoundaryRuns(left, right);
    expect(runs.length).toBeGreaterThan(0);
    expect(totalLength(runs)).toBeCloseTo(8, 6);
  });

  it("AYRIK poligonlarda ortak kenar YOK", () => {
    const a = rectangle(-10, 0, 8, 8);
    const b = rectangle(10, 0, 8, 8);
    expect(sharedBoundaryRuns(a, b)).toHaveLength(0);
  });

  it("mm ızgarası gürültüsünü TOLERE eder", () => {
    const left = rectangle(-5, 0, 10, 8);
    // Sağdaki 0,8 mm kaymış — clipper yuvarlamasının yaratabileceği fark.
    const right = polygon([
      [
        [0.0008, -4],
        [10, -4],
        [10, 4],
        [0.0008, 4],
        [0.0008, -4],
      ],
    ]);
    expect(totalLength(sharedBoundaryRuns(left, right))).toBeCloseTo(8, 3);
  });

  it("gerçek bir kaymayı tolere ETMEZ", () => {
    const left = rectangle(-5, 0, 10, 8);
    // 5 cm kayma bir duvar kayması, sayısal gürültü değil.
    const right = polygon([
      [
        [0.05, -4],
        [10, -4],
        [10, 4],
        [0.05, 4],
        [0.05, -4],
      ],
    ]);
    expect(sharedBoundaryRuns(left, right)).toHaveLength(0);
  });

  it("KÖŞE TEMASI duvar üretmez — kılcal enkaz elenir", () => {
    const a = rectangle(-5, -5, 10, 10); // köşesi (0,0)
    const b = rectangle(5, 5, 10, 10); // köşesi (0,0)
    expect(sharedBoundaryRuns(a, b)).toHaveLength(0);
  });

  it("contactLength cepheyi ölçer, ORTAK DUVARI saymaz", () => {
    const unit = rectangle(0, 0, 10, 6);
    // Yalnızca alt kenar cephe olarak sınıflandırılmış.
    const facade = [outerSegments(unit)[0]!];
    expect(contactLength(unit, facade)).toBeCloseTo(segmentLength(facade[0]!), 6);

    // Halka verilseydi çevrenin tamamı (32 m) sayılırdı — iyimser hata.
    const wholeRing = outerSegments(unit);
    expect(contactLength(unit, wholeRing)).toBeCloseTo(32, 6);
  });

  it("touches OLGUyu söyler — kural gerektirmez", () => {
    const unit = rectangle(0, 0, 10, 6);
    const facade = [outerSegments(unit)[0]!];
    expect(touches(unit, facade)).toBe(true);
    expect(touches(rectangle(100, 100, 4, 4), facade)).toBe(false);
  });
});

describe("property testleri (fast-check)", () => {
  it("ALAN KORUNUMU: her hedef ve her açı için parça + kalan = bütün", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 5, max: 40 }),
        fc.integer({ min: 0, max: 179 }),
        fc.integer({ min: 5, max: 95 }),
        (w, h, angle, percent) => {
          const plate = asMultiPolygon(rectangle(0, 0, w, h));
          const total = w * h;
          const cut = cutByArea(plate, linearSweep(plate, angle), (total * percent) / 100);
          const sum = multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest);
          expect(Math.abs(sum - total)).toBeLessThan(bound(plate));
          return true;
        },
      ),
      { numRuns: 150 },
    );
  });

  it("MONOTONLUK: daha büyük hedef → daha büyük parça", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 30 }),
        fc.integer({ min: 8, max: 30 }),
        fc.integer({ min: 0, max: 179 }),
        (w, h, angle) => {
          const plate = asMultiPolygon(rectangle(0, 0, w, h));
          const sweep = linearSweep(plate, angle);
          const small = cutByArea(plate, sweep, (w * h) * 0.25);
          const large = cutByArea(plate, sweep, (w * h) * 0.75);
          expect(large.achievedArea).toBeGreaterThan(small.achievedArea);
          expect(large.at).toBeGreaterThanOrEqual(small.at);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("eğik plakada da alan korunur (dönme değişmezi)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 179 }), fc.integer({ min: 10, max: 90 }), (theta, pct) => {
        const plate = asMultiPolygon(rotatePolygon(rectangle(0, 0, 24, 12), theta));
        const total = multiPolygonArea(plate);
        const cut = cutByArea(plate, linearSweep(plate, theta), (total * pct) / 100);
        const sum = multiPolygonArea(cut.piece) + multiPolygonArea(cut.rest);
        expect(Math.abs(sum - total)).toBeLessThan(bound(plate));
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("ortak sınır SİMETRİK: runs(a,b) uzunluğu = runs(b,a)", () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 20 }), fc.integer({ min: 4, max: 20 }), (w, h) => {
        const left = rectangle(-w / 2, 0, w, h);
        const right = rectangle(w / 2, 0, w, h);
        expect(totalLength(sharedBoundaryRuns(left, right))).toBeCloseTo(
          totalLength(sharedBoundaryRuns(right, left)),
          6,
        );
        return true;
      }),
      { numRuns: 60 },
    );
  });
});

describe("tolerans sabitleri ızgaradan türer", () => {
  it("eşdoğrusallık toleransı 2 mm", () => {
    expect(COLLINEAR_TOLERANCE).toBeCloseTo(0.002, 12);
  });

  it("kuantalama sınırı çevreyle ölçeklenir — sabit değil", () => {
    const small = asMultiPolygon(rectangle(0, 0, 4, 4)); // çevre 16
    const large = asMultiPolygon(rectangle(0, 0, 40, 40)); // çevre 160
    expect(areaQuantizationBound(small)).toBeCloseTo(0.016, 9);
    expect(areaQuantizationBound(large)).toBeCloseTo(0.16, 9);
  });

  it("EKSEN HİZALI kesimde hata kuantalama sınırının ÇOK altında", () => {
    const plate = asMultiPolygon(rectangle(0, 0, 20, 10));
    const cut = cutByArea(plate, linearSweep(plate, 0), 75);
    // Köşeler zaten ızgarada — hata pratikte sıfır.
    expect(Math.abs(cut.achievedArea - 75)).toBeLessThan(0.001);
  });
});
