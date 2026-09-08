import {
  isSelfIntersecting,
  multiPolygonArea,
  offsetByEdge,
  partCount,
  polygonArea,
  edgeCount,
  type EdgeSetback,
  type JoinType,
  type LocalMultiPolygon,
  type LocalPolygon,
} from "@/lib/geometry";
import { EMPTY_MULTI_POLYGON } from "@/lib/geometry/types";
import type { RoadFrontage, SpecialConstraintValue } from "@/lib/zoning/schemas";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * L0 YAPILAŞABİLİR ZARF HESABI — İP-2'nin "bitti sayılır" ölçütü.
 *
 * `mvp-spesifikasyonu.md`:55 zinciri:
 *   parsel poligonu → çekme mesafesi ötelemesi → taban alanı kontrolü
 *   → kat adedi → zarf
 *
 * SAF FONKSİYON: veritabanı, Prisma, i18n yok. Girdi verilir, sonuç ve
 * uyarılar döner. Yazma ayrı bir katmandadır (`*ComputedValue` kolonlarına).
 *
 * İKİ MOD — `Parcel.geometry` K2 olduğu için K1'de poligon yoktur:
 *   K1  skaler   : maxFootprint = alan × TAKS, maxTotalFloorArea = alan × emsal
 *   K2+ geometrik: yukarıdakiler + buildableEnvelope (öteleme)
 *
 * HİÇBİR EKSİK GİRDİ SESSİZCE VARSAYILMAZ. Eksik olan null döner ve uyarı
 * üretir (ilke 7: engelleme, uyar). Koda gömülü varsayılan YOKTUR (ilke 1).
 */

export type ConstraintEffectTarget = "maxHeight" | "maxFootprint" | "floorAreaRatio" | "none";
export type ConstraintEffectKind = "cap" | "multiply" | "subtract" | "none";

/** Katalogdan gelen etki tanımı (paket verisi). */
export interface ConstraintEffect {
  readonly ruleKey: string;
  readonly effectTarget: ConstraintEffectTarget;
  readonly effectKind: ConstraintEffectKind;
}

export interface L0Input {
  // --- Parcel ---
  readonly parcelArea: number | null;
  /** K2'den itibaren. Yerel metrik. */
  readonly parcelGeometry: LocalPolygon | null;

  // --- ZoningData (kullanıcı girdisi) ---
  readonly groundCoverageRatio: number | null;
  readonly floorAreaRatio: number | null;
  readonly setbackFront: number | null;
  readonly setbackSide: number | null;
  readonly setbackRear: number | null;
  readonly maxFloorCount: number | null;
  readonly maxHeight: number | null;
  readonly roadFrontages: readonly RoadFrontage[];
  readonly specialConstraints: readonly SpecialConstraintValue[];

  // --- Bölge paketi (dondurulmuş sürümden) ---
  /** VARSAYILANI YOK. null ise zarf HESAPLANMAZ (ilke 1). */
  readonly offsetJoinType: JoinType | null;
  readonly constraintCatalog: readonly ConstraintEffect[];
  /** Emsal harici alan kuralları tanımlı mı — İP-2 onları HESABA KATMAZ. */
  readonly hasFarExemptionRules: boolean;
}

export interface L0Output {
  readonly maxFootprint: number | null;
  readonly maxTotalFloorArea: number | null;
  /** MultiPolygon: öteleme bölebilir veya yok edebilir. */
  readonly buildableEnvelope: LocalMultiPolygon | null;
  /** İP-2'de DAİMA null — kuralı hiçbir dokümanda tanımlı değil (İP-3). */
  readonly basementGainFromLevelDifference: null;
  readonly floorCount: number | null;
  /** Özel kısıtlar uygulandıktan sonraki etkin yükseklik. */
  readonly effectiveMaxHeight: number | null;
  /** Ötelenmiş zarfın alanı — maxFootprint ile karşılaştırılır. */
  readonly envelopeArea: number | null;
  readonly warnings: readonly Warning[];
}

export function computeL0(input: L0Input): L0Output {
  const w = new WarningCollector();

  // ---------------------------------------------------------- özel kısıtlar
  const effects = resolveConstraintEffects(input, w);

  // ------------------------------------------------------------ 1. maxFootprint
  let maxFootprint: number | null = null;
  if (input.parcelArea === null) {
    w.addOnce("PARCEL_AREA_MISSING");
  } else if (input.groundCoverageRatio === null) {
    w.addOnce("GROUND_COVERAGE_RATIO_MISSING");
  } else {
    maxFootprint = input.parcelArea * input.groundCoverageRatio;
    maxFootprint = applyEffects(maxFootprint, effects, "maxFootprint");
  }

  // ------------------------------------------------------- 2. maxTotalFloorArea
  let maxTotalFloorArea: number | null = null;
  if (input.parcelArea !== null) {
    if (input.floorAreaRatio === null) {
      w.addOnce("FLOOR_AREA_RATIO_MISSING");
    } else {
      const far = applyEffects(input.floorAreaRatio, effects, "floorAreaRatio");
      maxTotalFloorArea = far === null ? null : input.parcelArea * far;
    }
  }

  // Emsal harici alanlar (sığınak, otopark, ortak alan…) ancak PROGRAM
  // girildikten sonra bilinir — A5, yani İP-3. Sonuç bu uyarıyla sunulur.
  if (maxTotalFloorArea !== null && input.hasFarExemptionRules) {
    w.addOnce("FAR_EXEMPTIONS_IGNORED");
  }

  // ----------------------------------------------------------- 3. etkin yükseklik
  const effectiveMaxHeight = applyEffects(input.maxHeight, effects, "maxHeight");

  // -------------------------------------------------------- 4. buildableEnvelope
  const envelope = computeEnvelope(input, w);
  const envelopeArea = envelope === null ? null : multiPolygonArea(envelope);

  // Taban alanı aşımı — SİSTEM KARAR VERMEZ, senaryo sunar.
  // Zarf ötelenmiş poligon olarak KALIR; kırpılmaz (veri modeli bölüm 15.2).
  if (envelopeArea !== null && maxFootprint !== null && envelopeArea > maxFootprint + 1e-6) {
    w.add("ENVELOPE_EXCEEDS_FOOTPRINT", {
      envelopeArea: round(envelopeArea, 2),
      maxFootprint: round(maxFootprint, 2),
    });
  }

  // ------------------------------------------------------------- 5. kat adedi
  let floorCount: number | null = null;
  if (input.maxFloorCount !== null) {
    floorCount = input.maxFloorCount;
  } else if (input.maxHeight !== null) {
    // Yükseklikten kat adedi çıkarmak KAT YÜKSEKLİĞİ gerektirir; o alan
    // A5'tedir (İP-3). Uydurma bir kat yüksekliği kullanmak ilke 1 ihlali olurdu.
    w.addOnce("FLOOR_COUNT_FROM_HEIGHT_UNAVAILABLE", { maxHeight: input.maxHeight });
  }

  // --------------------------------------------------------- 6. bodrum kazanımı
  // Kuralı hiçbir dokümanda tanımlı DEĞİL ve mvp:55'in L0 zincirinde de yok.
  w.addOnce("BASEMENT_GAIN_NOT_DEFINED");

  return {
    maxFootprint,
    maxTotalFloorArea,
    buildableEnvelope: envelope,
    basementGainFromLevelDifference: null,
    floorCount,
    effectiveMaxHeight,
    envelopeArea,
    warnings: w.all,
  };
}

// ---------------------------------------------------------------- zarf

function computeEnvelope(input: L0Input, w: WarningCollector): LocalMultiPolygon | null {
  if (input.parcelGeometry === null) {
    // K1'de beklenen durum: geometry K2'dir. Skaler hesap yine de yapılır.
    w.addOnce("PARCEL_GEOMETRY_MISSING");
    return null;
  }

  const outer = input.parcelGeometry.coordinates[0];
  if (!outer) return null;

  if (isSelfIntersecting(outer)) {
    // Alanı anlamsız, öteleme güvenilmez. Hesaplamıyoruz.
    w.addOnce("PARCEL_GEOMETRY_SELF_INTERSECTING");
    return null;
  }

  if (input.offsetJoinType === null) {
    // Köşe davranışı mevzuat yorumudur ve pakettedir. Varsayılan seçmek
    // ilke 1 ihlali olurdu: miter ile round arasında %8'e varan alan farkı var.
    w.addOnce("OFFSET_JOIN_TYPE_MISSING");
    return null;
  }

  // DİKKAT: `outer.length` KULLANILMAZ. Halka kapalı (ilk = son) veya açık
  // gelebilir; ham uzunluk ikisinde farklı sayı verir ve bir kenar çekmesiz
  // kalır. `edgeCount` halkayı önce normalleştirir.
  const setbacks = resolveEdgeSetbacks(input, edgeCount(outer), w);
  if (setbacks === null) return null;

  const envelope = offsetByEdge({
    polygon: input.parcelGeometry,
    setbacks,
    joinType: input.offsetJoinType,
  });

  const parts = partCount(envelope);
  if (parts === 0) {
    // Çekme mesafeleri parseli tamamen yedi. HATA DEĞİL, geçerli sonuç:
    // küçük parsel + büyük çekme Türkiye'de gerçek bir durumdur.
    w.add("ENVELOPE_VANISHED", { parcelArea: round(polygonArea(input.parcelGeometry), 2) });
    return EMPTY_MULTI_POLYGON;
  }
  if (parts > 1) {
    w.add("ENVELOPE_SPLIT", { parts });
  }

  return envelope;
}

/** Kenar rollerini çekme mesafelerine çevirir. */
function resolveEdgeSetbacks(
  input: L0Input,
  edges: number,
  w: WarningCollector,
): EdgeSetback[] | null {
  const { setbackFront, setbackSide, setbackRear } = input;

  if (setbackFront === null && setbackSide === null && setbackRear === null) {
    w.addOnce("SETBACKS_MISSING");
    return null;
  }

  const byRole = {
    front: setbackFront,
    side: setbackSide,
    rear: setbackRear,
  } as const;

  const roles = new Map<number, "front" | "side" | "rear">();
  for (const f of input.roadFrontages) {
    if (f.edgeIndex >= 0 && f.edgeIndex < edges) roles.set(f.edgeIndex, f.role);
  }

  let defaulted = 0;
  const setbacks: EdgeSetback[] = [];
  for (let i = 0; i < edges; i++) {
    const role = roles.get(i);
    if (role === undefined) defaulted++;
    // Rol verilmemişse "side" varsayılır — en yaygın kenar rolü budur.
    // Sessiz değil: kaç kenarın varsayıldığı uyarıda taşınır.
    const distance = byRole[role ?? "side"];
    setbacks.push({ edgeIndex: i, distance: distance ?? 0 });
  }

  if (defaulted > 0) {
    w.add("EDGE_ROLE_DEFAULTED", { edges: defaulted, total: edges });
  }

  return setbacks;
}

// ------------------------------------------------------------ kısıt etkileri

interface ResolvedEffect {
  readonly target: ConstraintEffectTarget;
  readonly kind: ConstraintEffectKind;
  readonly value: number;
}

function resolveConstraintEffects(
  input: L0Input,
  w: WarningCollector,
): ResolvedEffect[] {
  const catalog = new Map(input.constraintCatalog.map((c) => [c.ruleKey, c]));
  const out: ResolvedEffect[] = [];

  for (const constraint of input.specialConstraints) {
    if (!constraint.isChecked) continue;
    const def = catalog.get(constraint.ruleKey);
    if (!def || def.effectTarget === "none" || def.effectKind === "none") continue;

    if (constraint.value === undefined) {
      // İşaretli ve etkisi var ama değeri yok → sessizce atlamak zarfı
      // olduğundan BÜYÜK gösterirdi. İyimser hata en tehlikelisidir.
      w.add("CONSTRAINT_VALUE_MISSING", { ruleKey: constraint.ruleKey });
      continue;
    }

    out.push({ target: def.effectTarget, kind: def.effectKind, value: constraint.value });
  }

  return out;
}

function applyEffects(
  base: number | null,
  effects: readonly ResolvedEffect[],
  target: ConstraintEffectTarget,
): number | null {
  if (base === null) return null;
  let current = base;
  for (const e of effects) {
    if (e.target !== target) continue;
    switch (e.kind) {
      case "cap":
        current = Math.min(current, e.value);
        break;
      case "multiply":
        current *= e.value;
        break;
      case "subtract":
        current -= e.value;
        break;
      case "none":
        break;
    }
  }
  return Math.max(0, current);
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Poligonun dış halkasındaki kenar sayısı — çağıranlar için kolaylık. */
export function parcelEdgeCount(poly: LocalPolygon): number {
  const outer = poly.coordinates[0];
  return outer ? edgeCount(outer) : 0;
}
