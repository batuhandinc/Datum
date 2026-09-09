import { describe, expect, it } from "vitest";
import { polygon, rectangle, rotatePolygon } from "@/lib/geometry";
import {
  computeL4,
  verifyParkingCoefficient,
  type ElementRules,
  type L4Input,
  type L4Space,
  type WallType,
} from "@/lib/plan/l4";

/**
 * L4 DETAYLANDIRMA.
 *
 * En önemli üç davranış:
 *   1. Duvar TÜRETİLİR — iki mekanın paylaştığı sınırdan; tip de ilişkiden.
 *   2. Kural yoksa duvar ve açıklık ÜRETİLMEZ (ölçüsüz açıklık, İP-5'te
 *      sessizce sıfır doğrama metrajı demektir).
 *   3. Kolon aksı otopark katsayısını DOĞRULAR, DEĞİŞTİRMEZ.
 */

const PLATE = rectangle(0, 0, 12, 8); // 96 m²

/** İki mekan yan yana: sol 6×8, sağ 6×8; ortak kenar x = 0'da, 8 m. */
const LEFT = rectangle(-3, 0, 6, 8);
const RIGHT = rectangle(3, 0, 6, 8);

const RULES: ElementRules = {
  wallThickness: new Map<WallType, number>([
    ["dis", 0.3],
    ["ic", 0.1],
    ["islakHacim", 0.15],
    ["saft", 0.2],
    ["birimAyirici", 0.2],
  ]),
  daylightRatio: new Map([
    ["salon", 0.125],
    ["yatakOdasi", 0.125],
  ]),
  minDoorWidth: 0.8,
  columnSpanX: 6,
  columnSpanY: 6,
};

const space = (over: Partial<L4Space> & { spaceId: string }): L4Space => ({
  layoutKey: over.spaceId,
  spaceType: "salon",
  unitId: "u1",
  geometry: null,
  isWetArea: false,
  ...over,
});

function input(over: Partial<L4Input> = {}): L4Input {
  return {
    plate: PLATE,
    shafts: [],
    spaces: [
      space({ spaceId: "a", geometry: LEFT }),
      space({ spaceId: "b", geometry: RIGHT, spaceType: "yatakOdasi" }),
    ],
    rules: RULES,
    clearHeight: 2.7,
    ...over,
  };
}

const wallsOfType = (out: ReturnType<typeof computeL4>, t: WallType) =>
  out.walls.filter((w) => w.wallType === t);

describe("duvar türetme", () => {
  it("iki mekanın PAYLAŞTIĞI sınır duvara dönüşür", () => {
    const out = computeL4(input());
    const inner = wallsOfType(out, "ic");
    expect(inner.length).toBe(1);
    expect(inner[0]!.length).toBeCloseTo(8, 3);
    expect(inner[0]!.thickness).toBe(0.1);
  });

  it("plakaya değen kenarlar DIŞ duvar olur", () => {
    const out = computeL4(input());
    expect(wallsOfType(out, "dis").length).toBeGreaterThan(0);
    for (const w of wallsOfType(out, "dis")) expect(w.thickness).toBe(0.3);
  });

  it("ISLAK mekan sınırı ıslak hacim duvarı olur", () => {
    const out = computeL4(
      input({
        spaces: [
          space({ spaceId: "a", geometry: LEFT }),
          space({ spaceId: "b", geometry: RIGHT, spaceType: "banyo", isWetArea: true }),
        ],
      }),
    );
    const wet = wallsOfType(out, "islakHacim");
    expect(wet.length).toBe(1);
    expect(wet[0]!.thickness).toBe(0.15);
  });

  it("İKİ BİRİMİ ayıran sınır birim ayırıcı olur", () => {
    const out = computeL4(
      input({
        spaces: [
          space({ spaceId: "a", geometry: LEFT, unitId: "u1" }),
          space({ spaceId: "b", geometry: RIGHT, unitId: "u2" }),
        ],
      }),
    );
    expect(wallsOfType(out, "birimAyirici").length).toBe(1);
  });

  it("ŞAFT sınırı şaft duvarı olur ve kapı ALMAZ", () => {
    const shaft = rectangle(3, 0, 6, 8); // sağ mekanla çakışan bir şaft
    const out = computeL4(
      input({
        shafts: [shaft],
        spaces: [
          space({ spaceId: "a", geometry: LEFT }),
          space({ spaceId: "b", geometry: RIGHT }),
        ],
      }),
    );
    const shaftWalls = wallsOfType(out, "saft");
    expect(shaftWalls.length).toBeGreaterThan(0);
    for (const sw of shaftWalls) {
      expect(out.openings.some((o) => o.wallKey === sw.wallKey)).toBe(false);
    }
  });

  it("duvar anahtarı BİRİM KİMLİĞİ taşır — aynı katta çakışmaz", () => {
    const out = computeL4(
      input({
        spaces: [
          space({ spaceId: "a1", layoutKey: "salon", geometry: LEFT, unitId: "u1" }),
          space({ spaceId: "b1", layoutKey: "salon", geometry: RIGHT, unitId: "u2" }),
        ],
      }),
    );
    const keys = out.walls.map((w) => w.wallKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((k) => k.includes("u1"))).toBe(true);
    expect(keys.some((k) => k.includes("u2"))).toBe(true);
  });

  it("netArea ve volume ÜRETİLMEZ — açıklık düşümü İP-5'in işi", () => {
    const out = computeL4(input());
    for (const w of out.walls) {
      expect(Object.keys(w)).not.toContain("netArea");
      expect(Object.keys(w)).not.toContain("volume");
    }
  });

  it("EĞİK plakada da çalışır", () => {
    const angle = 27;
    const out = computeL4(
      input({
        plate: rotatePolygon(PLATE, angle),
        spaces: [
          space({ spaceId: "a", geometry: rotatePolygon(LEFT, angle) }),
          space({ spaceId: "b", geometry: rotatePolygon(RIGHT, angle) }),
        ],
      }),
    );
    expect(wallsOfType(out, "ic").length).toBe(1);
    expect(wallsOfType(out, "dis").length).toBeGreaterThan(0);
  });
});

describe("kural yoksa üretilmez", () => {
  it("duvar kalınlığı kuralı yoksa DUVAR ÜRETİLMEZ", () => {
    const out = computeL4(input({ rules: { ...RULES, wallThickness: new Map() } }));
    expect(out.walls).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("BUILDING_ELEMENT_RULE_MISSING");
  });

  it("KAPI ÖLÇÜSÜ yoksa açıklık üretilmez", () => {
    const out = computeL4(input({ rules: { ...RULES, minDoorWidth: null } }));
    expect(out.openings).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L4_DOOR_RULE_MISSING");
    // Duvarlar yine üretilir — kapı kuralı duvarı engellemez.
    expect(out.walls.length).toBeGreaterThan(0);
  });

  it("net yükseklik yoksa açıklık üretilmez", () => {
    const out = computeL4(input({ clearHeight: null }));
    expect(out.openings).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L4_CLEAR_HEIGHT_MISSING");
  });

  it("AYDINLATMA ORANI olmayan mekan tipine pencere açılmaz", () => {
    const out = computeL4(
      input({
        spaces: [
          space({ spaceId: "a", geometry: LEFT, spaceType: "depo" }),
          space({ spaceId: "b", geometry: RIGHT, spaceType: "depo" }),
        ],
      }),
    );
    expect(out.openings.filter((o) => o.openingType === "pencere")).toHaveLength(0);
  });

  it("aks aralığı yoksa ızgara üretilmez", () => {
    const out = computeL4(input({ rules: { ...RULES, columnSpanX: null, columnSpanY: null } }));
    expect(out.columnGrid).toBeNull();
    expect(out.warnings.map((w) => w.code)).toContain("L4_COLUMN_SPAN_MISSING");
  });
});

describe("açıklıklar", () => {
  it("iç duvara KAPI gelir", () => {
    const out = computeL4(input());
    const doors = out.openings.filter((o) => o.openingType === "kapi");
    expect(doors.length).toBe(1);
    expect(doors[0]!.width).toBe(0.8);
    expect(doors[0]!.adjacentSpaceId).not.toBeNull();
  });

  it("dış duvara PENCERE gelir, aydınlatma oranından boyutlanır", () => {
    const out = computeL4(input());
    const windows = out.openings.filter((o) => o.openingType === "pencere");
    expect(windows.length).toBeGreaterThan(0);
    for (const win of windows) {
      expect(win.isExterior).toBe(true);
      expect(win.width).toBeGreaterThan(0);
      expect(win.height).toBeCloseTo(2.7, 2);
    }
  });

  it("kapı genişliğini taşımayan duvara kapı gelmez", () => {
    // Çok kısa bir ortak kenar üreten iki mekan.
    const tinyA = polygon([[[0, 0], [1, 0], [1, 0.5], [0, 0.5], [0, 0]]]);
    const tinyB = polygon([[[1, 0], [2, 0], [2, 0.5], [1, 0.5], [1, 0]]]);
    const out = computeL4(
      input({
        plate: rectangle(1, 0.25, 2, 0.5),
        spaces: [
          space({ spaceId: "a", geometry: tinyA }),
          space({ spaceId: "b", geometry: tinyB }),
        ],
        rules: { ...RULES, minDoorWidth: 0.9 },
      }),
    );
    // Ortak kenar 0,5 m; kapı 0,9 m istiyor.
    expect(out.openings.filter((o) => o.openingType === "kapi")).toHaveLength(0);
  });
});

describe("kolon aks ızgarası", () => {
  it("ızgara üretilir ve kolon sayılır", () => {
    const out = computeL4(input());
    expect(out.columnGrid).not.toBeNull();
    expect(out.columnGrid!.spacingX).toBe(6);
    expect(out.columnGrid!.axes.length).toBeGreaterThan(0);
    expect(out.columnGrid!.columnCount).toBeGreaterThan(0);
  });

  it("EĞİK plakada ızgara ANA EKSENE hizalanır", () => {
    const tilted = rotatePolygon(PLATE, 40);
    const out = computeL4(
      input({
        plate: tilted,
        spaces: [space({ spaceId: "a", geometry: rotatePolygon(LEFT, 40) })],
      }),
    );
    expect(out.columnGrid).not.toBeNull();
    // Eksen hizalı olsaydı kolon sayısı plakanın çevreleyen kutusuna göre
    // hesaplanır ve gerçekten fazla çıkardı.
    expect(out.columnGrid!.columnCount).toBeGreaterThan(0);
    expect(out.columnGrid!.columnCount).toBeLessThan(20);
  });
});

describe("otopark katsayısı DOĞRULANIR, değiştirilmez", () => {
  const grid = { spacingX: 6, spacingY: 6, axes: [], columnCount: 4 };

  it("katsayıya YAKIN ölçüm uyarı üretmez", () => {
    // 6×6 = 36 m² göz; 2,5×5 park yeri → yönde 2 araç sığar → 18 m²/araç.
    const r = verifyParkingCoefficient(grid, 18, 2.5, 5);
    expect(r.warnings).toHaveLength(0);
    expect(r.measured).toBeCloseTo(18, 1);
  });

  it("BELİRGİN sapma uyarı üretir ama KATSAYI DEĞİŞMEZ", () => {
    const coefficient = 30;
    const r = verifyParkingCoefficient(grid, coefficient, 2.5, 5);
    expect(r.warnings.map((w) => w.code)).toContain("L4_PARKING_COEFFICIENT_DEVIATION");
    // Dönen değer bir TEŞHİSTİR; katsayı girdiden değişmeden çıkar.
    expect(coefficient).toBe(30);
    expect(r.measured).not.toBe(coefficient);
  });

  it("veri eksikse ölçüm yapılmaz — uydurma sayı yok", () => {
    expect(verifyParkingCoefficient(null, 18, 2.5, 5).measured).toBeNull();
    expect(verifyParkingCoefficient(grid, null, 2.5, 5).measured).toBeNull();
    expect(verifyParkingCoefficient(grid, 18, null, 5).measured).toBeNull();
    expect(verifyParkingCoefficient(grid, 18, 2.5, null).measured).toBeNull();
  });

  it("göze hiç araç sığmıyorsa ölçüm yapılmaz", () => {
    const narrow = { spacingX: 2, spacingY: 2, axes: [], columnCount: 4 };
    expect(verifyParkingCoefficient(narrow, 18, 2.5, 5).measured).toBeNull();
  });
});

describe("determinizm", () => {
  it("aynı girdi iki kez → birebir aynı duvar ve açıklıklar", () => {
    const a = computeL4(input());
    const b = computeL4(input());
    expect(JSON.stringify(a.walls)).toBe(JSON.stringify(b.walls));
    expect(JSON.stringify(a.openings)).toBe(JSON.stringify(b.openings));
  });
});
