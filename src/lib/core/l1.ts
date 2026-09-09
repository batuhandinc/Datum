import {
  boundingBox,
  containsPolygon,
  distanceToRing,
  multiPolygonArea,
  normalizeRing,
  partCount,
  polygonArea,
  rectangle,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * L1 — ÇEKİRDEK YERLEŞİMİ. Saf hesap: Prisma, i18n, veritabanı YOK.
 *
 * L0 zarfı verir; L1 zarfın SABİT NOKTASINI yerleştirir
 * (`etut-portali-proje-dokumani.md` §5 katman 3: "Kat planı üretiminin sabit
 * noktasıdır"). Zincir `etut-veri-modeli.md` §15.3'te:
 *
 *   zarf → strateji → poligon → şaft göreli konumları → kaçış mesafesi
 *
 * ÇIKTI BİR ÖNERİDİR. Kullanıcı hem stratejiyi hem poligonu ezer; ezme mevcut
 * `<alan>OverrideValue` altyapısına yazılır (ilke 5).
 *
 * KURAL YOKSA HESAPLANMAZ + UYARI (ilke 1): asansör adedi, merdiven genişliği,
 * sirkülasyon genişliği ve kaçış mesafesi yerel mevzuattır, uydurulamaz.
 */

export type CoreStrategy = "merkezi" | "kenar" | "cift";

/** `CoreRule`'un L1'i ilgilendiren alanları — Decimal'ler çözülmüş hâlde. */
export interface CoreRuleInput {
  readonly elevatorRequiredFloorThreshold: number | null;
  readonly elevatorRequiredHeightThreshold: number | null;
  readonly minElevatorCount: number | null;
  readonly stretcherElevatorRequired: boolean | null;
  readonly minStretcherCabinWidth: number | null;
  readonly minStretcherCabinDepth: number | null;
  readonly minStairWidth: number | null;
  readonly minCirculationWidth: number | null;
  readonly maxEscapeDistance: number | null;
}

/** Kullanıcının girdiği asansör ölçüleri; yoksa paket minimumundan ön-dolar. */
export interface ElevatorInput {
  readonly shaftWidth: number | null;
  readonly shaftDepth: number | null;
}

export interface L1Input {
  /** L0'ın ürettiği yapılaşabilir zarf. */
  readonly buildableEnvelope: LocalMultiPolygon | null;
  readonly floorCount: number | null;
  readonly buildingHeight: number | null;
  /** Tipik kattaki bağımsız bölüm sayısı — strateji önerisinin girdisi. */
  readonly unitCountPerFloor: number | null;
  readonly coreRule: CoreRuleInput | null;
  /** Kullanıcının girdiği asansörler. Boşsa paket minimumu kullanılır. */
  readonly elevators: readonly ElevatorInput[];
  /** Kullanıcı stratejiyi ezdiyse ÖNERİ ÜRETİLMEZ, bu kullanılır. */
  readonly strategyOverride: CoreStrategy | null;
}

export interface L1Output {
  readonly coreStrategy: CoreStrategy | null;
  readonly geometry: LocalPolygon | null;
  readonly area: number | null;
  readonly requiredElevatorCount: number | null;
  /** Zarfın en uzak noktasından çekirdeğe kuş uçuşu mesafe. */
  readonly escapeDistance: number | null;
  readonly warnings: readonly Warning[];
}

/**
 * Strateji önerisinin en-boy eşikleri.
 *
 * Bunlar ALGORİTMA SEZGİSELİDİR, yerel mevzuat DEĞİLDİR — bu yüzden pakette
 * değil kodda dururlar (ilke 1 ihlali değil). Çıktı zaten kullanıcının ezdiği
 * bir öneridir; yanlış olması bir sayıyı değil bir başlangıç noktasını etkiler.
 */
const ELONGATED_RATIO = 1.8;
const DOUBLE_CORE_RATIO = 3.0;
const DOUBLE_CORE_MIN_UNITS = 8;

/** Plakanın en-boy oranı (uzun kenar / kısa kenar), en az 1. */
function aspectRatio(plate: LocalPolygon): number {
  const bb = boundingBox(plate);
  const long = Math.max(bb.width, bb.height);
  const short = Math.min(bb.width, bb.height);
  if (short <= 0) return Infinity;
  return long / short;
}

/**
 * Strateji ÖNERİSİ.
 *
 * Uzun ve çok birimli plakada tek merkezî çekirdek kaçış mesafesini aşar;
 * çok uzun plakada iki çekirdek gerekir. Eşikler yukarıda, gerekçesiyle.
 */
export function suggestStrategy(
  plate: LocalPolygon,
  unitCountPerFloor: number | null,
): CoreStrategy {
  const ratio = aspectRatio(plate);
  if (ratio >= DOUBLE_CORE_RATIO && (unitCountPerFloor ?? 0) >= DOUBLE_CORE_MIN_UNITS) {
    return "cift";
  }
  if (ratio >= ELONGATED_RATIO) return "kenar";
  return "merkezi";
}

/**
 * Gereken asansör adedi.
 *
 * Eşiklerin HİÇBİRİ sağlanmıyorsa asansör zorunlu değildir → 0.
 * Eşik sağlanıyorsa paket minimumu geçerlidir; minimum tanımsızsa hesaplanamaz.
 */
export function requiredElevatorCount(
  rule: CoreRuleInput,
  floorCount: number | null,
  buildingHeight: number | null,
): number | null {
  const byFloor =
    rule.elevatorRequiredFloorThreshold !== null &&
    floorCount !== null &&
    floorCount >= rule.elevatorRequiredFloorThreshold;

  const byHeight =
    rule.elevatorRequiredHeightThreshold !== null &&
    buildingHeight !== null &&
    buildingHeight >= rule.elevatorRequiredHeightThreshold;

  if (!byFloor && !byHeight) return 0;
  return rule.minElevatorCount;
}

/** Zarfın en büyük parçası — çekirdek oraya yerleşir. */
function largestPart(envelope: LocalMultiPolygon): LocalPolygon | null {
  let best: LocalPolygon | null = null;
  let bestArea = 0;
  for (const rings of envelope.coordinates) {
    const poly: LocalPolygon = { crs: envelope.crs, type: "Polygon", coordinates: rings };
    const area = polygonArea(poly);
    if (area > bestArea) {
      bestArea = area;
      best = poly;
    }
  }
  return best;
}

/**
 * Çekirdek ölçüleri.
 *
 * Genişlik = asansör kuyularının yan yana toplamı + merdiven + hol.
 * Derinlik  = en derin asansör kuyusu + hol.
 *
 * DERİNLİK VARSAYIMI: merdiven asansörlerle AYNI derinlik bandına oturur —
 * çekirdekte yan yana dizilirler. Bu geometrik bir varsayımdır, mevzuat değil;
 * merdivenin kendi ayak izini hesaplamak kol sayısı ve sahanlık derinliği
 * ister ve ikisi de hiçbir dokümanda tanımlı değil.
 */
function coreDimensions(
  rule: CoreRuleInput,
  elevators: readonly ElevatorInput[],
  elevatorCount: number,
): { width: number; depth: number } | null {
  if (rule.minStairWidth === null || rule.minCirculationWidth === null) return null;

  // Asansör ölçüsü: kullanıcı girdiyse o, yoksa paketin sedye minimumu
  // (doküman §6: "sedye asansöründe paket minimumu").
  const widths: number[] = [];
  const depths: number[] = [];
  for (let i = 0; i < elevatorCount; i++) {
    const e = elevators[i];
    const w = e?.shaftWidth ?? rule.minStretcherCabinWidth;
    const d = e?.shaftDepth ?? rule.minStretcherCabinDepth;
    if (w === null || w === undefined || d === null || d === undefined) return null;
    widths.push(w);
    depths.push(d);
  }

  const elevatorBankWidth = widths.reduce((a, b) => a + b, 0);
  const deepest = depths.length === 0 ? 0 : Math.max(...depths);

  return {
    width: elevatorBankWidth + rule.minStairWidth + rule.minCirculationWidth,
    depth: Math.max(deepest, rule.minStairWidth) + rule.minCirculationWidth,
  };
}

/** Stratejiye göre çekirdek merkezinin aday konumu. */
function anchorFor(plate: LocalPolygon, strategy: CoreStrategy, size: { width: number; depth: number }): LocalPoint {
  const bb = boundingBox(plate);
  const cx = (bb.minX + bb.maxX) / 2;
  const cy = (bb.minY + bb.maxY) / 2;

  if (strategy === "merkezi") return [cx, cy];

  // Kenar ve çift: uzun eksenin kısa kenarına yaslanır. Çekirdek zarfın
  // dışına taşmasın diye yarım ölçü kadar içeri çekilir.
  const horizontal = bb.width >= bb.height;
  if (horizontal) return [bb.minX + size.width / 2, cy];
  return [cx, bb.minY + size.depth / 2];
}

/**
 * En uzak nokta → çekirdek mesafesi.
 *
 * İP-3'te KUŞ UÇUŞU ölçülür. Koridor boyu ölçüm gerçek plan geometrisi
 * gerektirir ve o İP-4'e aittir; kuş uçuşu daima gerçek mesafeden KÜÇÜKTÜR,
 * yani bu ölçüm aşımı gizlemez, yalnızca geç yakalar.
 */
function farthestDistance(plate: LocalPolygon, core: LocalPolygon): number {
  const coreRing = core.coordinates[0]!;
  let worst = 0;
  for (const p of normalizeRing(plate.coordinates[0] ?? [])) {
    const d = distanceToRing(p, coreRing);
    if (d > worst) worst = d;
  }
  return worst;
}

export function computeL1(input: L1Input): L1Output {
  const w = new WarningCollector();

  const empty: L1Output = {
    coreStrategy: null,
    geometry: null,
    area: null,
    requiredElevatorCount: null,
    escapeDistance: null,
    warnings: w.all,
  };

  if (!input.coreRule) {
    w.addOnce("CORE_RULE_MISSING", { count: 0 });
    return { ...empty, warnings: w.all };
  }
  const rule = input.coreRule;

  const elevatorCount = requiredElevatorCount(rule, input.floorCount, input.buildingHeight);
  if (elevatorCount === null) {
    w.addOnce("CORE_ELEVATOR_COUNT_UNAVAILABLE");
  }

  if (!input.buildableEnvelope || multiPolygonArea(input.buildableEnvelope) <= 0) {
    w.addOnce("CORE_PLATE_MISSING");
    return { ...empty, requiredElevatorCount: elevatorCount, warnings: w.all };
  }

  if (partCount(input.buildableEnvelope) > 1) {
    // Zarf bölünmüşse çekirdek EN BÜYÜK parçaya yerleşir; diğer parçalar
    // kendi çekirdeğini gerektirebilir ama bu İP-3 kapsamında değil.
    w.addOnce("CORE_ENVELOPE_SPLIT", { parts: partCount(input.buildableEnvelope) });
  }

  const plate = largestPart(input.buildableEnvelope);
  if (!plate) return { ...empty, requiredElevatorCount: elevatorCount, warnings: w.all };

  const strategy = input.strategyOverride ?? suggestStrategy(plate, input.unitCountPerFloor);

  const size = coreDimensions(rule, input.elevators, elevatorCount ?? 0);
  if (!size || size.width <= 0 || size.depth <= 0) {
    w.addOnce("CORE_DIMENSIONS_UNAVAILABLE");
    return {
      ...empty,
      coreStrategy: strategy,
      requiredElevatorCount: elevatorCount,
      warnings: w.all,
    };
  }

  const [ax, ay] = anchorFor(plate, strategy, size);
  const geometry = rectangle(ax, ay, size.width, size.depth);

  if (!containsPolygon(plate, geometry)) {
    // Engellemiyoruz (ilke 7): çekirdek yine önerilir, kullanıcı taşır.
    w.addOnce("CORE_OUTSIDE_ENVELOPE");
  }

  const escapeDistance = farthestDistance(plate, geometry);
  if (rule.maxEscapeDistance !== null && escapeDistance > rule.maxEscapeDistance) {
    w.add("CORE_ESCAPE_DISTANCE_EXCEEDED", {
      distance: round(escapeDistance, 2),
      limit: rule.maxEscapeDistance,
    });
  }

  return {
    coreStrategy: strategy,
    geometry,
    area: round(polygonArea(geometry), 3),
    requiredElevatorCount: elevatorCount,
    escapeDistance: round(escapeDistance, 3),
    warnings: w.all,
  };
}

/**
 * ŞAFTIN MUTLAK KONUMU — düşey sürekliliğin yapısal garantisi.
 *
 * `Shaft.offsetX/offsetY` çekirdek orijinine GÖRELİDİR. Mutlak konum burada
 * TÜRETİLİR ve hiçbir yerde saklanmaz; çekirdek taşınınca tüm katlardaki
 * şaftlar kendiliğinden birlikte taşınır. Süreklilik korunması gereken bir
 * kural değil, yapısal bir sonuçtur.
 */
/**
 * ŞAFT KONUMU ÖNERİSİ — çekirdeğe göreli offset'ler.
 *
 * SÜRÜM 1.4'TE EKLENDİ ve gerekçesi şu: `Shaft.offsetX/offsetY` 1.3'te K3
 * MANUEL alandı ve HİÇBİR MOTOR YAZMIYORDU. Sonuç, şaft konumunun her
 * projede bilinmemesi ve dolayısıyla L3'ün "banyo şafta bitişik" iddiası
 * dahil BÜTÜN ıslak hacim kısıtlarının "değerlendirilemedi" çıkmasıydı —
 * sistem ıslak hacimleri topladığını sanırken hiçbir şey onları
 * toplamıyordu.
 *
 * YERLEŞİM: şaftlar çekirdeğin ARKA kenarına (giriş holünün karşısına),
 * uzun eksen boyunca EŞİT ARALIKLA dizilir. Bu bir mimari sezgiseldir,
 * mevzuat değil — ve çıktı EZİLEBİLİR bir ÖNERİDİR (kullanıcı K3'te taşır).
 * Konum kuraldan türetilemez: hiçbir doküman şaftın çekirdek içinde nereye
 * konacağını tanımlamıyor.
 *
 * Dönen offset'ler çekirdek ORİJİNİNE (bbox merkezi) GÖRELİDİR; mutlak
 * konum `shaftAbsolutePosition` ile türer ve düşey süreklilik yapısal
 * olarak korunur.
 */
export function proposeShaftOffsets(
  core: LocalPolygon,
  count: number,
): readonly LocalPoint[] {
  if (count <= 0) return [];
  const bb = boundingBox(core);
  const horizontal = bb.width >= bb.height;

  // Arka kenardan içeri, kenarın çeyreği kadar.
  const inset = (horizontal ? bb.height : bb.width) / 4;
  const along = horizontal ? bb.width : bb.height;

  const out: LocalPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    // Eşit aralık: [i+1] / [count+1] → kenarlara yapışmaz.
    const t = (i + 1) / (count + 1) - 0.5;
    out.push(horizontal ? [t * along, bb.height / 2 - inset] : [bb.width / 2 - inset, t * along]);
  }
  return out;
}

export function shaftAbsolutePosition(
  core: LocalPolygon,
  offsetX: number,
  offsetY: number,
): LocalPoint {
  const bb = boundingBox(core);
  return [(bb.minX + bb.maxX) / 2 + offsetX, (bb.minY + bb.maxY) / 2 + offsetY];
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
