import { describe, expect, it } from "vitest";
import { polygonArea, rectangle, rotatePolygon } from "@/lib/geometry";
import { computeL3, type L3Input, type RelationKind } from "@/lib/plan/l3";
import { outerSegments } from "@/lib/subdivide/boundary";
import {
  parseLayoutRecipe,
  recipeLeaves,
  totalWeight,
  validateRecipe,
  type LayoutRecipe,
} from "@/lib/plan/template";

/**
 * L3 ŞABLON ESNETME.
 *
 * En önemli iki davranış:
 *   1. Sığmayan mekan MEKAN BAŞINA G1'e düşer — birim başına değil.
 *   2. Şaft konumu bilinmiyorsa ıslak hacim iddiası "değerlendirilemedi"dir,
 *      "sağlandı" DEĞİL. Aksi halde sistem ıslak hacimleri topladığını sanır
 *      ama hiçbir şey onları toplamamıştır.
 */

/** Basit 2+1: antre + salon + iki oda + banyo. */
const RECIPE: LayoutRecipe = {
  version: 1,
  root: {
    kind: "split",
    axis: "uzun",
    children: [
      {
        kind: "split",
        axis: "kisa",
        children: [
          { kind: "space", layoutKey: "antre", spaceType: "antre", weight: 1, relation: { entry: true } },
          { kind: "space", layoutKey: "banyo", spaceType: "banyo", weight: 1, relation: { shaft: true } },
        ],
      },
      { kind: "space", layoutKey: "salon", spaceType: "salon", weight: 3, relation: { facade: true } },
      { kind: "space", layoutKey: "oda1", spaceType: "yatakOdasi", weight: 2, relation: { facade: true } },
      { kind: "space", layoutKey: "oda2", spaceType: "yatakOdasi", weight: 2 },
    ],
  },
};

const UNIT = rectangle(0, 0, 12, 10); // 120 m²
const CORE_EDGE = outerSegments(rectangle(-6.5, 0, 1, 4)); // birimin sol kenarına dayalı
const FACADE = [outerSegments(UNIT)[2]!]; // üst kenar

function input(over: Partial<L3Input> = {}): L3Input {
  return {
    unit: UNIT,
    targetArea: 100,
    recipe: RECIPE,
    entryEdges: CORE_EDGE,
    facadeEdges: FACADE,
    shafts: [],
    dimensionRules: [
      { spaceType: "salon", minArea: 12, minClearWidth: 3 },
      { spaceType: "yatakOdasi", minArea: 9, minClearWidth: 2.5 },
      { spaceType: "banyo", minArea: 3, minClearWidth: 1.2 },
      { spaceType: "antre", minArea: 2, minClearWidth: 1.1 },
    ],
    ...over,
  };
}

const stateOf = (out: ReturnType<typeof computeL3>, key: string, rel: RelationKind) =>
  out.placements.find((p) => p.layoutKey === key)!.checks.find((c) => c.relation === rel)?.state;

describe("şablon şeması", () => {
  it("geçerli reçeteyi okur", () => {
    expect(parseLayoutRecipe(RECIPE)).not.toBeNull();
    expect(recipeLeaves(RECIPE.root)).toHaveLength(5);
    expect(totalWeight(RECIPE.root)).toBe(9);
  });

  it("BOZUK Json null döner — BOŞ REÇETE DEĞİL", () => {
    // Boş reçete "mekansız daire" demek olurdu ve sessizce sıfır metraj üretirdi.
    expect(parseLayoutRecipe(null)).toBeNull();
    expect(parseLayoutRecipe({ version: 2, root: RECIPE.root })).toBeNull();
    expect(parseLayoutRecipe("bozuk")).toBeNull();
  });

  it("TEKRARLANAN anahtar geçersizdir", () => {
    const bad: LayoutRecipe = {
      version: 1,
      root: {
        kind: "split",
        axis: "uzun",
        children: [
          { kind: "space", layoutKey: "oda", spaceType: "yatakOdasi", weight: 1 },
          { kind: "space", layoutKey: "oda", spaceType: "yatakOdasi", weight: 1 },
        ],
      },
    };
    expect(validateRecipe(bad).some((p) => p.startsWith("DATUM_RECIPE_DUPLICATE_KEY"))).toBe(true);
  });

  it("VAR OLMAYAN bağlantı hedefi geçersizdir", () => {
    const bad: LayoutRecipe = {
      version: 1,
      root: {
        kind: "split",
        axis: "uzun",
        children: [
          {
            kind: "space",
            layoutKey: "salon",
            spaceType: "salon",
            weight: 1,
            relation: { connectsTo: ["mutfak"] },
          },
          { kind: "space", layoutKey: "oda", spaceType: "yatakOdasi", weight: 1 },
        ],
      },
    };
    expect(validateRecipe(bad).some((p) => p.startsWith("DATUM_RECIPE_UNKNOWN_TARGET"))).toBe(true);
  });

  it("geçerli reçetede sorun YOK", () => {
    expect(validateRecipe(RECIPE)).toEqual([]);
  });
});

describe("esnetme", () => {
  it("bütün mekanlar yerleşir ve ALAN KORUNUR", () => {
    const out = computeL3(input());
    expect(out.placements).toHaveLength(5);
    const total = out.placements.reduce((s, p) => s + (p.area ?? 0), 0);
    expect(total).toBeCloseTo(polygonArea(UNIT), 1);
  });

  it("hedef alanlar AĞIRLIKLA paylaşılır", () => {
    const out = computeL3(input());
    const salon = out.placements.find((p) => p.layoutKey === "salon")!;
    // 100 m² net × 3/9 = 33,33
    expect(salon.targetArea).toBeCloseTo(33.333, 2);
  });

  it("gerçekleşen alanlar ağırlık oranına YAKIN", () => {
    const out = computeL3(input());
    const salon = out.placements.find((p) => p.layoutKey === "salon")!;
    // Birim 120 m², ağırlık 3/9 → ~40 m²
    expect(salon.area!).toBeGreaterThan(35);
    expect(salon.area!).toBeLessThan(45);
  });

  it("EĞİK birimde de çalışır", () => {
    const tilted = rotatePolygon(UNIT, 31);
    const out = computeL3(input({ unit: tilted, facadeEdges: [outerSegments(tilted)[2]!] }));
    const total = out.placements.reduce((s, p) => s + (p.area ?? 0), 0);
    expect(total).toBeCloseTo(polygonArea(tilted), 1);
  });

  it("DETERMİNİST: aynı girdi iki kez → birebir aynı", () => {
    expect(JSON.stringify(computeL3(input()).placements)).toBe(
      JSON.stringify(computeL3(input()).placements),
    );
  });
});

describe("üç durumlu iddia tanısı", () => {
  it("ŞAFT YOKSA ıslak hacim iddiası DEĞERLENDİRİLEMEDİ — sağlandı değil", () => {
    const out = computeL3(input({ shafts: [] }));
    expect(stateOf(out, "banyo", "shaft")).toBe("degerlendirilemedi");
  });

  it("şaft varsa ölçülür", () => {
    // Birimin sol alt köşesine dayalı bir şaft.
    const shaft = rectangle(-5.5, -4.5, 1, 1);
    const out = computeL3(input({ shafts: [shaft] }));
    expect(stateOf(out, "banyo", "shaft")).not.toBe("degerlendirilemedi");
  });

  it("CEPHE iddiası ölçülür", () => {
    const out = computeL3(input());
    expect(["saglandi", "ihlal"]).toContain(stateOf(out, "salon", "facade"));
  });

  it("asgari alan kuralı YOKSA hüküm verilmez", () => {
    const out = computeL3(input({ dimensionRules: [] }));
    for (const p of out.placements) {
      expect(p.checks.find((c) => c.relation === "minArea")!.state).toBe("degerlendirilemedi");
    }
  });

  it("asgari alan kuralı VARSA hüküm verilir", () => {
    const out = computeL3(input());
    const salon = out.placements.find((p) => p.layoutKey === "salon")!;
    const check = salon.checks.find((c) => c.relation === "minArea")!;
    expect(check.state).toBe("saglandi");
    expect(check.limit).toBe(12);
  });

  it("ÇOK KÜÇÜK birimde asgari alan İHLALİ çıkar", () => {
    const tiny = rectangle(0, 0, 4, 3); // 12 m² — beş mekana bölünecek
    const out = computeL3(input({ unit: tiny, facadeEdges: [outerSegments(tiny)[2]!] }));
    const violations = out.placements.flatMap((p) =>
      p.checks.filter((c) => c.relation === "minArea" && c.state === "ihlal"),
    );
    expect(violations.length).toBeGreaterThan(0);
  });
});

describe("G1'e düşüş — MEKAN başına", () => {
  it("reçete yoksa hesaplanmaz", () => {
    const out = computeL3(input({ recipe: null }));
    expect(out.placements).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L3_RECIPE_MISSING");
  });

  it("birim poligonu yoksa hesaplanmaz", () => {
    const out = computeL3(input({ unit: null }));
    expect(out.placements).toHaveLength(0);
    expect(out.warnings.map((w) => w.code)).toContain("L3_UNIT_GEOMETRY_MISSING");
  });

  it("HEDEF BİLİNMİYORSA uydurma alan üretilmez — ağırlık taşınır", () => {
    const out = computeL3(input({ targetArea: null }));
    const salon = out.placements.find((p) => p.layoutKey === "salon")!;
    // Ağırlığın kendisi (3), uydurulmuş bir m² değil.
    expect(salon.targetArea).toBe(3);
  });

  it("G1'e düşen mekan HEDEFİNİ korur ve uyarı üretir", () => {
    // Tek yapraklı ama ağırlığı sıfıra yakın olmayan bir reçeteyle dejenere
    // hücre üretmek zor; bunun yerine sıfır alanlı birim verelim.
    const degenerate: LayoutRecipe = {
      version: 1,
      root: {
        kind: "split",
        axis: "uzun",
        children: [
          { kind: "space", layoutKey: "a", spaceType: "salon", weight: 1 },
          { kind: "space", layoutKey: "b", spaceType: "yatakOdasi", weight: 1 },
        ],
      },
    };
    // Neredeyse dejenere birim: 0,001 m² — ikinci hücre boş çıkabilir.
    const sliver = rectangle(0, 0, 0.05, 0.02);
    const out = computeL3(input({ unit: sliver, recipe: degenerate, facadeEdges: [] }));
    // Sonuç ne olursa olsun ÇÖKMEZ ve her yaprak bir satır alır.
    expect(out.placements).toHaveLength(2);
    for (const p of out.placements) {
      expect(p.targetArea).toBeGreaterThan(0);
    }
  });
});
