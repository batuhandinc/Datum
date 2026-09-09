import {
  minWidth,
  polygonArea,
  principalAxis,
  type LocalPolygon,
} from "@/lib/geometry";
import { asMultiPolygon, cutByArea, linearSweep, toPolygons } from "@/lib/subdivide/kernel";
import { contactLength, outerSegments, touches, type Segment } from "@/lib/subdivide/boundary";
import { WarningCollector, type Warning } from "@/lib/warnings";
import {
  recipeLeaves,
  totalWeight,
  type LayoutRecipe,
  type LeafNode,
  type RecipeNode,
} from "./template";

/**
 * L3 — BİRİM İÇİ MEKAN YERLEŞİMİ (saf hesap).
 *
 * `kat-plani-uretim-mimarisi.md` §2 L3: "Her bağımsız bölüm, tipoloji
 * şablonuna göre mekanlara ayrılır. Yaklaşım: ŞABLON ESNETME. Sıfırdan
 * üretim DEĞİL."
 *
 * Reçete YAPIYI verir, `cutByArea` geometriyi birimin gerçek poligonuna
 * oturtur — L2 ile AYNI çekirdek, farklı parametre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SIĞMAYAN MEKAN G1'E DÜŞER — BİRİM BAŞINA DEĞİL, MEKAN BAŞINA.
 *
 * Geçerli hücre alamayan mekan hedef alanıyla KALIR, `geometry` null olur ve
 * `Space.perimeter` `k × √alan` ile `SpaceShapeFactorRule`'dan türer
 * (veri modeli §1.5'in G1 seviyesi). Metraj yine çıkar; rapor hangi
 * mekanların G1'de kaldığını gösterir.
 *
 * Birim başına düşmek — "3+1 sığmadı, tüm daire G1" — bir yatak odası
 * yüzünden salonun da gerçek geometrisini atmak olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ADAY SAYISI DEKLARE EDİLMİŞTİR. Aynı tipteki yaprakların permütasyonunu
 * denemek FAKTÖRİYELDİR (4+1'de 4 yatak × 3 banyo = 144, üstüne eksen
 * çevirmeleri) ve determinizm zaman aşımıyla kesmeyi YASAKLIYOR. Bu yüzden
 * yalnızca AYNALAMA denenir: iki aday, sabit sıra, sabit maliyet.
 */

export type CheckState = "saglandi" | "ihlal" | "degerlendirilemedi";
export type RelationKind = "entry" | "facade" | "shaft" | "minArea" | "minClearWidth";

export interface RelationCheck {
  readonly relation: RelationKind;
  readonly state: CheckState;
  readonly measured: number | null;
  readonly limit: number | null;
}

export interface L3Placement {
  readonly layoutKey: string;
  readonly spaceType: string;
  readonly name: string | null;
  /** null = geçerli hücre alamadı, G1'e düştü. */
  readonly geometry: LocalPolygon | null;
  /** Gerçekleşen alan; G1'de null. */
  readonly area: number | null;
  /** Hedef alan (net) — reçete ağırlığından ve birim hedefinden türer. */
  readonly targetArea: number;
  readonly checks: readonly RelationCheck[];
}

/** Mekan ölçü kuralları — `BuildingElementRule`'un okunmuş hâli. */
export interface SpaceDimensionRule {
  readonly spaceType: string;
  readonly minArea: number | null;
  readonly minClearWidth: number | null;
}

export interface L3Input {
  /** L2'nin (veya manuel modun) ürettiği birim poligonu. */
  readonly unit: LocalPolygon | null;
  /** Birimin NET hedef alanı — `Σ Space.area`. */
  readonly targetArea: number | null;
  readonly recipe: LayoutRecipe | null;
  /** Girişi tanımlayan kenarlar: çekirdek + sirkülasyon sınırı. */
  readonly entryEdges: readonly Segment[];
  /** Cephe olarak sınıflandırılmış kenarlar. */
  readonly facadeEdges: readonly Segment[];
  /**
   * Şaft ayak izleri.
   *
   * BOŞ OLABİLİR ve bu SIK KARŞILAŞILAN durumdur: `Shaft.offsetX/offsetY`
   * ile `width/depth` nullable'dır. Boşsa şaft iddiaları
   * "değerlendirilemedi" olur — sağlandı DEĞİL.
   */
  readonly shafts: readonly LocalPolygon[];
  readonly dimensionRules: readonly SpaceDimensionRule[];
}

export interface L3Output {
  readonly placements: readonly L3Placement[];
  readonly warnings: readonly Warning[];
}

const EMPTY: L3Output = { placements: [], warnings: [] };

const round = (v: number, d = 3): number => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/** Bir hücreyi çocukların ağırlığına göre böler. */
function splitCell(
  cell: LocalPolygon,
  children: readonly RecipeNode[],
  axis: "uzun" | "kisa",
): (LocalPolygon | null)[] {
  const weights = children.map((c) => (c.kind === "space" ? c.weight : totalWeight(c)));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return children.map(() => null);

  const axisAngle = principalAxis(cell)?.angle ?? 0;
  const sweepAngle = axis === "uzun" ? axisAngle : axisAngle + 90;

  const out: (LocalPolygon | null)[] = [];
  let region = asMultiPolygon(cell);
  const cellArea = polygonArea(cell);

  for (let i = 0; i < children.length; i += 1) {
    const isLast = i === children.length - 1;
    if (isLast) {
      // SON ÇOCUK KALANI ALIR — ama yalnızca burada, çünkü ağırlıklar
      // tanım gereği hücreyi tam tüketir. Bu, L2'deki "son birim kalanı
      // yutar" hatasıyla AYNI DEĞİLDİR: orada hedefler hücreden bağımsızdı.
      const parts = toPolygons(region);
      out.push(parts.length === 0 ? null : largest(parts));
      break;
    }
    const target = (cellArea * weights[i]!) / sum;
    const cut = cutByArea(region, linearSweep(region, sweepAngle), target);
    if (!cut.converged) {
      out.push(null);
      continue;
    }
    const parts = toPolygons(cut.piece);
    out.push(parts.length === 0 ? null : largest(parts));
    region = cut.rest;
  }
  return out;
}

function largest(parts: readonly LocalPolygon[]): LocalPolygon {
  let best = parts[0]!;
  let bestArea = polygonArea(best);
  for (let i = 1; i < parts.length; i += 1) {
    const a = polygonArea(parts[i]!);
    if (a > bestArea) {
      best = parts[i]!;
      bestArea = a;
    }
  }
  return best;
}

/** Reçeteyi hücreye oynatır; her yaprağa bir hücre düşer (veya null). */
function replay(node: RecipeNode, cell: LocalPolygon | null): Map<string, LocalPolygon | null> {
  const out = new Map<string, LocalPolygon | null>();
  if (node.kind === "space") {
    out.set(node.layoutKey, cell);
    return out;
  }
  const cells = cell === null ? node.children.map(() => null) : splitCell(cell, node.children, node.axis);
  node.children.forEach((child, i) => {
    for (const [k, v] of replay(child, cells[i] ?? null)) out.set(k, v);
  });
  return out;
}

/** Ağacı AYNALAR — her düğümün çocuk sırasını tersine çevirir. */
function mirror(node: RecipeNode): RecipeNode {
  if (node.kind === "space") return node;
  return { kind: "split", axis: node.axis, children: [...node.children].reverse().map(mirror) };
}

/** İddiaları ölçer ve üç durumlu tanı üretir. */
function checkLeaf(
  leaf: LeafNode,
  cell: LocalPolygon | null,
  input: L3Input,
): RelationCheck[] {
  const checks: RelationCheck[] = [];
  const rel = leaf.relation ?? {};
  const rule = input.dimensionRules.find((r) => r.spaceType === leaf.spaceType) ?? null;

  const unevaluable = (relation: RelationKind, limit: number | null = null): RelationCheck => ({
    relation,
    state: "degerlendirilemedi",
    measured: null,
    limit,
  });

  // --- entry ---
  if (rel.entry) {
    if (cell === null || input.entryEdges.length === 0) checks.push(unevaluable("entry"));
    else {
      const len = contactLength(cell, input.entryEdges);
      checks.push({
        relation: "entry",
        state: len > 0 ? "saglandi" : "ihlal",
        measured: round(len, 2),
        limit: null,
      });
    }
  }

  // --- facade ---
  if (rel.facade) {
    if (cell === null || input.facadeEdges.length === 0) checks.push(unevaluable("facade"));
    else {
      const len = contactLength(cell, input.facadeEdges);
      checks.push({
        relation: "facade",
        state: len > 0 ? "saglandi" : "ihlal",
        measured: round(len, 2),
        limit: null,
      });
    }
  }

  // --- shaft ---
  if (rel.shaft) {
    // Şaft konumu BİLİNMİYORSA sağlandı SAYILMAZ. Sistemin "ıslak hacimleri
    // şafta topladım" demesi ancak şaftın nerede olduğunu bildiğinde anlamlıdır.
    if (cell === null || input.shafts.length === 0) checks.push(unevaluable("shaft"));
    else {
      const edges = input.shafts.flatMap((s) => outerSegments(s));
      checks.push({
        relation: "shaft",
        state: touches(cell, edges) ? "saglandi" : "ihlal",
        measured: round(contactLength(cell, edges), 2),
        limit: null,
      });
    }
  }

  // --- asgari alan (HÜKÜM: eşik paketten) ---
  if (cell === null) checks.push(unevaluable("minArea", rule?.minArea ?? null));
  else if (rule?.minArea == null) checks.push(unevaluable("minArea"));
  else {
    const area = polygonArea(cell);
    checks.push({
      relation: "minArea",
      state: area >= rule.minArea ? "saglandi" : "ihlal",
      measured: round(area, 2),
      limit: rule.minArea,
    });
  }

  // --- asgari net genişlik ---
  if (cell === null) checks.push(unevaluable("minClearWidth", rule?.minClearWidth ?? null));
  else if (rule?.minClearWidth == null) checks.push(unevaluable("minClearWidth"));
  else {
    const wdt = minWidth(cell);
    checks.push({
      relation: "minClearWidth",
      state: wdt === null ? "degerlendirilemedi" : wdt >= rule.minClearWidth ? "saglandi" : "ihlal",
      measured: wdt === null ? null : round(wdt, 2),
      limit: rule.minClearWidth,
    });
  }

  return checks;
}

/** Sağlanan iddia sayısı — aday skorlaması. */
function score(checks: readonly RelationCheck[]): number {
  return checks.filter((c) => c.state === "saglandi").length;
}

export function computeL3(input: L3Input): L3Output {
  const w = new WarningCollector();

  if (input.recipe === null) {
    w.addOnce("L3_RECIPE_MISSING");
    return { ...EMPTY, warnings: w.all };
  }
  if (!input.unit) {
    w.addOnce("L3_UNIT_GEOMETRY_MISSING");
    return { ...EMPTY, warnings: w.all };
  }

  const leaves = recipeLeaves(input.recipe.root);
  const weightSum = totalWeight(input.recipe.root);
  const unitTarget = input.targetArea;

  // İKİ ADAY: reçetenin kendisi ve AYNASI. Deklare edilmiş, sabit maliyet.
  const candidates: RecipeNode[] = [input.recipe.root, mirror(input.recipe.root)];

  let bestCells: Map<string, LocalPolygon | null> | null = null;
  let bestScore = -1;

  candidates.forEach((candidate, index) => {
    const cells = replay(candidate, input.unit);
    const total = leaves.reduce(
      (s, leaf) => s + score(checkLeaf(leaf, cells.get(leaf.layoutKey) ?? null, input)),
      0,
    );
    // Eşitlikte KÜÇÜK İNDEKS kazanır — açık ve deterministik.
    if (total > bestScore) {
      bestScore = total;
      bestCells = cells;
      void index;
    }
  });

  const cells: Map<string, LocalPolygon | null> = bestCells ?? new Map();

  const placements: L3Placement[] = leaves.map((leaf) => {
    const cell = cells.get(leaf.layoutKey) ?? null;
    const checks = checkLeaf(leaf, cell, input);
    if (cell === null) w.add("L3_SPACE_DEGRADED", { layoutKey: leaf.layoutKey });
    return {
      layoutKey: leaf.layoutKey,
      spaceType: leaf.spaceType,
      name: leaf.name ?? null,
      geometry: cell,
      area: cell === null ? null : round(polygonArea(cell), 3),
      // Hedef alan birimin NET hedefinden ağırlıkla pay alır. Birim hedefi
      // bilinmiyorsa ağırlığın kendisi taşınır — uydurma bir alan üretilmez.
      targetArea:
        unitTarget === null ? leaf.weight : round((unitTarget * leaf.weight) / weightSum, 3),
      checks,
    };
  });

  return { placements, warnings: w.all };
}
