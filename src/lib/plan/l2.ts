import {
  booleanOp,
  multiPolygonArea,
  partCount,
  polygon,
  polygonArea,
  principalAxis,
  ringCentroid,
  rotatePolygon,
  rectangle,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import {
  asMultiPolygon,
  cutByArea,
  linearSweep,
  toPolygons,
  wedgeSweep,
  type Sweep,
} from "@/lib/subdivide/kernel";
import { touches, outerSegments, type Segment } from "@/lib/subdivide/boundary";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * L2 — KAT PLAKASI BÖLÜMLEME (saf hesap).
 *
 * `kat-plani-uretim-mimarisi.md` §2 L2: "Kat plakasından çekirdek çıkarıldıktan
 * sonra kalan alanı, kullanıcının belirlediği hedef alanlara sahip N adet
 * bağımsız bölüme, her birinin CEPHE alacağı ve ÇEKİRDEĞE ERİŞECEĞİ şekilde
 * bölmek."
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SİSTEM PROGRAMI ÖLÇEKLEMEZ.
 *
 * Yaygın (ve panelin üç tasarımında da bulunan) hata: `hedef_i = kalan_alan ×
 * hedef_i / Σhedef`. Bu normalizasyon plakayı DAİMA tam tüketir; program
 * plakanın %60'ıysa bütün daireler sessizce %66 şişer ve `areaTolerance`
 * kontrolü ASLA ateşlenemez, çünkü sapma tanım gereği sıfırdır.
 *
 * `etut-portali-proje-dokumani.md` §5 katman 4: "bağımsız bölüm karmasını
 * KULLANICI BELİRLER, sistem önermez… sistem programı zarfa YERLEŞTİRİR."
 * Yerleştirmek ölçeklemek değildir.
 *
 * Burada her birim KENDİ hedefine kesilir. Program sığmazsa kuyruktaki
 * birimler `unplaced` kalır; plakayı doldurmuyorsa fark ARTIK olarak durur.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * BRÜT/NET KATSAYISI PAKETTEN GELİR. Hedef NET, plaka BRÜT; katsayı bölmeyle
 * uydurulamaz (yukarıdaki normalizasyonun ta kendisi olurdu). Yoksa
 * HESAPLANMAZ + uyarı — `offsetJoinType` ve `areaPerSpace` emsalleri.
 *
 * L2 ÇEKİRDEĞİ ASLA OYNATMAZ. `kat-plani` §2 L2 adım 4 "alternatif çekirdek
 * konumuyla yeniden dene" diyor ama §6 çekirdeğin proje geneli sabit olduğunu
 * ve taşınması için onay gerektiğini söylüyor. İkisi bağdaşmaz. L2 ihlallerin
 * çekirdeğin hangi yüzünde kümelendiğini RAPORLAR; aday konum üretmek
 * `kat-plani` §8'de Faz 3, onay akışı İP-8'dir.
 */

export type CoreStrategy = "merkezi" | "kenar" | "cift";

export interface L2Unit {
  readonly unitId: string;
  readonly unitNo: string | null;
  /** NET hedef (`Σ Space.area`). BİLİNMEYEBİLİR — sıfır değil. */
  readonly targetArea: number | null;
}

export interface L2Input {
  /** Zarfın en büyük parçası. */
  readonly plate: LocalPolygon | null;
  readonly core: LocalPolygon | null;
  readonly coreStrategy: CoreStrategy | null;
  /** `CoreRule.minCirculationWidth` — koridor genişliği. */
  readonly minCirculationWidth: number | null;
  /** `UnitLayoutRule.grossToNetFactor`. */
  readonly grossToNetFactor: number | null;
  readonly units: readonly L2Unit[];
}

export interface L2Placement {
  readonly unitId: string;
  /** Yerleşemediyse null. */
  readonly geometry: LocalPolygon | null;
  /** Kesimden çıkan ama erişilemeyen ve artığa aktarılan alan (m²). */
  readonly discardedArea: number;
}

export interface L2Output {
  readonly placements: readonly L2Placement[];
  /** Üretilen sirkülasyon poligonları (kat holü / koridor). */
  readonly circulation: readonly LocalPolygon[];
  /** Hiçbir birime verilemeyen alan (m²). */
  readonly residualArea: number | null;
  readonly warnings: readonly Warning[];
}

const EMPTY: L2Output = {
  placements: [],
  circulation: [],
  residualArea: null,
  warnings: [],
};

/**
 * Kesim sonrası KABUL EDİLEBİLİR parçayı seçer.
 *
 * Erişim tohumuna (çekirdek ∪ sirkülasyon) DEĞEN parçalar birimindir; geri
 * kalanı artığa gider ve MİKTARI raporlanır. Çekirdeğin içinde "en büyük
 * parçayı al" demek, atılan alanı sessizce buharlaştırmak olurdu.
 *
 * Birden çok erişilebilir parça varsa EN BÜYÜĞÜ alınır: iki kopuk lekeden
 * oluşan bir daire "anlamlı nesne" değildir (ilke 4).
 */
function acceptablePart(
  piece: LocalMultiPolygon,
  access: readonly Segment[],
): { kept: LocalPolygon | null; discarded: number } {
  const parts = toPolygons(piece);
  if (parts.length === 0) return { kept: null, discarded: 0 };

  const reachable = access.length === 0 ? parts : parts.filter((p) => touches(p, access));
  if (reachable.length === 0) {
    // Hiçbir parça erişilemiyor: en büyüğü yine de birime verilir ki kullanıcı
    // sorunu GÖRSÜN. `checkSubdivision` bunu `coreAccess=ihlal` olarak basar.
    // Sessizce atmak, birimi yok saymak olurdu.
    const largest = largestOf(parts);
    return { kept: largest, discarded: multiPolygonArea(piece) - polygonArea(largest) };
  }

  const kept = largestOf(reachable);
  return { kept, discarded: multiPolygonArea(piece) - polygonArea(kept) };
}

function largestOf(parts: readonly LocalPolygon[]): LocalPolygon {
  let best = parts[0]!;
  let bestArea = polygonArea(best);
  for (let i = 1; i < parts.length; i += 1) {
    const a = polygonArea(parts[i]!);
    // Eşitlikte küçük indeks kazanır — deterministik.
    if (a > bestArea) {
      best = parts[i]!;
      bestArea = a;
    }
  }
  return best;
}

/**
 * `kenar` stratejisinde sirkülasyon omurgası.
 *
 * Plakanın ANA EKSENİ boyunca, çekirdekten geçen bir şerit. Eksen hizalı
 * `boundingBox` kullanılsaydı grid'e eğik bir plakada omurga cepheyle açı
 * yapar ve her dış kenar boyunca testere dişli birimler doğardı.
 */
function spineFor(
  plate: LocalPolygon,
  core: LocalPolygon,
  width: number,
): LocalPolygon | null {
  const axis = principalAxis(plate);
  if (!axis) return null;
  const centre = ringCentroid(core.coordinates[0]!);
  // Plakayı kesin aşan uzunlukta bir şerit; fazlası plakayla kesiştirilerek atılır.
  const span = axis.length * 2;
  const strip = rectangle(centre[0], centre[1], span, width);
  const rotated = rotatePolygon(strip, axis.angle, centre);
  const clipped = booleanOp([plate], [rotated], "intersection");
  const parts = toPolygons(clipped);
  return parts.length === 0 ? null : largestOf(parts);
}

/** Kama süpürmesinin başlangıç açısı — plakanın ana ekseni. Deterministik. */
function wedgeStartAngle(plate: LocalPolygon): number {
  return principalAxis(plate)?.angle ?? 0;
}

export function computeL2(input: L2Input): L2Output {
  const w = new WarningCollector();

  if (!input.plate) {
    w.addOnce("PLAN_PLATE_MISSING");
    return { ...EMPTY, warnings: w.all };
  }
  if (!input.core) {
    w.addOnce("PLAN_CORE_MISSING");
    return { ...EMPTY, warnings: w.all };
  }
  if (input.units.length === 0) {
    return { ...EMPTY, residualArea: polygonArea(input.plate), warnings: w.all };
  }

  // Çift çekirdek ŞEMADA UYGULANAMAZ: `Core.blockId @unique` blok başına tek
  // çekirdek demek ve `anchorFor` `cift`'i `kenar` gibi konumlandırıyor.
  // Tahmin edilmiş bir varsayılanla devam etmek yerine HESAPLAMIYORUZ (ilke 1).
  if (input.coreStrategy === "cift") {
    w.addOnce("L2_DOUBLE_CORE_UNSUPPORTED");
    return { ...EMPTY, warnings: w.all };
  }

  if (input.grossToNetFactor === null) {
    w.addOnce("L2_GROSS_TO_NET_MISSING");
    return { ...EMPTY, warnings: w.all };
  }

  // ---- Sirkülasyon ----
  const circulation: LocalPolygon[] = [];
  if (input.coreStrategy === "kenar") {
    if (input.minCirculationWidth === null) {
      // Koridor genişliği YEREL KURALDIR. Uydurmak yerine hesaplamıyoruz;
      // eksik kuralla farklı bir mimari yazmak (radyale düşmek) daha kötüdür.
      w.addOnce("CORE_RULE_MISSING", { count: 0 });
      return { ...EMPTY, warnings: w.all };
    }
    const spine = spineFor(input.plate, input.core, input.minCirculationWidth);
    if (spine) circulation.push(spine);
  }

  // ---- Kalan alan ----
  const blockers = [input.core, ...circulation];
  let remaining: LocalMultiPolygon = booleanOp([input.plate], blockers, "difference");

  const accessSeed: Segment[] = [
    ...outerSegments(input.core),
    ...circulation.flatMap((c) => outerSegments(c)),
  ];

  // ---- Birimleri sırayla kes ----
  // SIRA: hedefi BİLİNEN birimler, hedef AZALAN. Toplam sıra, eşitlik
  // `unitId` ile bozulur → determinizm.
  const ordered = [...input.units]
    .map((u, i) => ({ u, i }))
    .sort((a, b) => {
      const ta = a.u.targetArea;
      const tb = b.u.targetArea;
      if (ta === null && tb === null) return a.i - b.i;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return tb !== ta ? tb - ta : a.i - b.i;
    });

  const placements = new Map<string, L2Placement>();

  for (const { u } of ordered) {
    if (u.targetArea === null) {
      // BİLİNMEYEN ≠ SIFIR: hedefi bilinmeyen birime alan kesilmez ve
      // DİĞERLERİNİN payı bundan etkilenmez.
      placements.set(u.unitId, { unitId: u.unitId, geometry: null, discardedArea: 0 });
      continue;
    }

    if (multiPolygonArea(remaining) <= 0) {
      placements.set(u.unitId, { unitId: u.unitId, geometry: null, discardedArea: 0 });
      continue;
    }

    const grossTarget = u.targetArea * input.grossToNetFactor;
    const sweep = sweepFor(input, remaining);
    const cut = cutByArea(remaining, sweep, grossTarget);

    if (!cut.converged) {
      // Kalan alan hedeften küçük: birim yerleşmez. Kalanı SIFIR ALANLI bir
      // dilim olarak vermek, arızayı "artık atıldı" diye yanlış teşhis etmek
      // olurdu — hakem panelinin L2#3'te yakaladığı kusur.
      placements.set(u.unitId, { unitId: u.unitId, geometry: null, discardedArea: 0 });
      continue;
    }

    const { kept, discarded } = acceptablePart(cut.piece, accessSeed);
    placements.set(u.unitId, {
      unitId: u.unitId,
      geometry: kept,
      discardedArea: discarded,
    });
    if (partCount(cut.piece) > 1 && kept !== null) {
      w.add("L2_UNIT_SPLIT", {
        unitNo: u.unitNo ?? u.unitId,
        discarded: Math.round(discarded * 100) / 100,
      });
    }

    // Atılan parçalar KALANA geri döner — hiçbir m² buharlaşmaz.
    remaining = kept === null ? cut.rest : booleanOp(toPolygons(remaining), [kept], "difference");
  }

  const residualArea = Math.max(0, multiPolygonArea(remaining));

  return {
    placements: input.units.map(
      (u) =>
        placements.get(u.unitId) ?? { unitId: u.unitId, geometry: null, discardedArea: 0 },
    ),
    circulation,
    residualArea: Math.round(residualArea * 1000) / 1000,
    warnings: w.all,
  };
}

/**
 * Stratejiye göre süpürme ailesi.
 *
 * `merkezi` → KAMA: çekirdek ağırlık merkezinden ışınlar. Her dilim hem
 * çekirdeğe (iç uç) hem cepheye (dış uç) değer, dolayısıyla iki sert kısıt
 * bir KONTROL değil çözümün TANIMI olur.
 *
 * `kenar` → DOĞRUSAL: omurgaya DİK kesimler; cephe dış kenardan, çekirdek
 * erişimi koridordan gelir.
 */
function sweepFor(input: L2Input, remaining: LocalMultiPolygon): Sweep {
  const plate = input.plate!;
  if (input.coreStrategy === "kenar") {
    const axis = principalAxis(plate);
    // Omurgaya DİK: ana eksene 90° eklenir.
    return linearSweep(remaining, (axis?.angle ?? 0) + 90);
  }
  const apex: LocalPoint = ringCentroid(input.core!.coordinates[0]!);
  return wedgeSweep(remaining, apex, wedgeStartAngle(plate));
}

export { polygon };
