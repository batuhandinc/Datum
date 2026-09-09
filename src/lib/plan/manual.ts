import { z } from "zod";
import {
  LOCAL_CRS,
  SCALE,
  booleanOp,
  intersects,
  multiPolygon,
  multiPolygonArea,
  polygon,
  polygonArea,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import { capsuleAroundSegment } from "@/lib/geometry/clipper";
import { toPolygons } from "@/lib/subdivide/kernel";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * MANUEL BÖLÜMLEME — kullanıcı kesme çizgileri çizer, birim poligonları TÜRER.
 *
 * SAF: Prisma/Next yok. Tuval (tarayıcı) ve sunucu aynı dosyayı kullanır.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN KESME ÇİZGİSİ, SERBEST POLİGON DEĞİL.
 *
 * Kullanıcı her birimin sınırını ayrı ayrı çizseydi, boşluk ve çakışma
 * KAÇINILMAZ olurdu ve "Σbirim + çekirdek + sirkülasyon = kat" değişmezi
 * denetlenip uyarılan bir şeye dönerdi. Kesme çizgisinde bu değişmez İNŞA
 * GEREĞİ doğrudur: parçalar tek bir bölgenin bölünmesinden çıkar, dolayısıyla
 * ne üst üste binebilir ne aralarında delik kalabilir.
 *
 * `mvp-spesifikasyonu.md` §3 İP-4'ün "kullanıcı zarf üzerinde birim
 * SINIRLARINI çizer" ifadesinin birebir karşılığıdır: sınır çizilir, alan değil.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ÇEKİRDEK KESİLEMEZ. Çekirdek ve sirkülasyon plakadan ÖNCE düşülür; kesmeler
 * yalnızca kalan alanda çalışır. Çizgi çekirdeğin üzerinden geçerse orada bir
 * etkisi olmaz ve kullanıcı uyarılır — engellenmez (ilke 7).
 */

/**
 * BIÇAK YARIÇAPI (metre).
 *
 * Poligonu bir POLİÇİZGİYLE bölmenin doğrudan bir boolean karşılığı yoktur;
 * clipper sınırlı poligonlarla çalışır. Çizgi bu yüzden ince bir "bıçak"
 * poligonuna dönüştürülüp çıkarılır.
 *
 * Yarıçap clipper ızgarasının bir birimidir (1 mm), yani bıçak 2 mm geniştir.
 * 20 m'lik bir kesmede kaybolan alan 0,04 m² olur — plakanın kuantalama
 * sınırının (`çevre × ızgara`) altında kalır ve `checkSubdivision` bunu
 * zaten gürültü sayar. Kayıp yine de ÖLÇÜLÜR ve raporlanır: "hiçbir m²
 * sessizce buharlaşmaz" iddiası ancak böyle doğru olur.
 */
const KNIFE_RADIUS = 1 / SCALE;

/** Kesme çizgisi — poliçizgi, en az iki nokta. */
export interface CutLine {
  readonly points: readonly LocalPoint[];
}

const pointSchema = z.tuple([z.number().finite(), z.number().finite()]);

export const cutLineSchema = z.object({
  points: z.array(pointSchema).min(2),
});

export const cutLineListSchema = z.array(cutLineSchema);

/** Bozuk veya eksik Json güvenle boş listeye düşer — asla fırlatmaz. */
export function parseCutLines(value: unknown): CutLine[] {
  const parsed = cutLineListSchema.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data.map((c) => ({ points: c.points.map(([x, y]) => [x, y] as LocalPoint) }));
}

export interface ManualCutResult {
  /** Bölünmüş parçalar, ALAN AZALAN sırada (deterministik). */
  readonly pieces: readonly LocalPolygon[];
  /** Bıçak kalınlığından kaybolan alan (m²) — ölçülür, gizlenmez. */
  readonly lostArea: number;
  readonly warnings: readonly Warning[];
}

/** Bir poliçizgiyi bıçak poligonlarına çevirir. */
function knivesFor(cut: CutLine): LocalPolygon[] {
  const out: LocalPolygon[] = [];
  for (let i = 0; i < cut.points.length - 1; i += 1) {
    const a = cut.points[i]!;
    const b = cut.points[i + 1]!;
    if (a[0] === b[0] && a[1] === b[1]) continue;
    out.push(...toPolygons(capsuleAroundSegment(a, b, KNIFE_RADIUS)));
  }
  return out;
}

/**
 * Kesme çizgilerini bölgeye uygular ve parçaları döndürür.
 *
 * `region` çekirdek ve sirkülasyon ZATEN DÜŞÜLMÜŞ kalan alandır.
 *
 * `blocked` (çekirdek + sirkülasyon) yalnızca UYARI üretmek için verilir;
 * geometriyi etkilemez.
 */
export function applyCuts(
  region: LocalMultiPolygon,
  cuts: readonly CutLine[],
  blocked: readonly LocalPolygon[] = [],
): ManualCutResult {
  const w = new WarningCollector();
  const before = multiPolygonArea(region);

  if (cuts.length === 0) {
    w.addOnce("PLAN_NO_CUTS");
    return { pieces: toPolygons(region), lostArea: 0, warnings: w.all };
  }

  const knives: LocalPolygon[] = [];
  for (const cut of cuts) {
    if (cut.points.length < 2) {
      w.add("PLAN_CUT_INVALID", { count: cut.points.length });
      continue;
    }
    const k = knivesFor(cut);
    if (blocked.length > 0 && k.some((piece) => blocked.some((b) => intersects(piece, b)))) {
      w.addOnce("PLAN_CUT_CROSSES_CORE");
    }
    knives.push(...k);
  }

  if (knives.length === 0) {
    return { pieces: toPolygons(region), lostArea: 0, warnings: w.all };
  }

  const cutRegion = booleanOp(toPolygons(region), knives, "difference");
  const pieces = toPolygons(cutRegion);

  // ALAN AZALAN sıra — toplam sıra, eşitlik indeksle bozulur (determinizm).
  const ordered = pieces
    .map((p, i) => ({ p, area: polygonArea(p), i }))
    .sort((a, b) => (b.area !== a.area ? b.area - a.area : a.i - b.i))
    .map((e) => e.p);

  return {
    pieces: ordered,
    lostArea: Math.max(0, before - multiPolygonArea(cutRegion)),
    warnings: w.all,
  };
}

/**
 * Parçaları birimlere eşleştirme ÖNERİSİ — alan azalan ↔ hedef azalan.
 *
 * ÖNERİDİR, KARAR DEĞİL. Kullanıcı her parçayı istediği birime atayabilir;
 * bu yalnızca ilk açılışta makul bir başlangıç verir. Sistem hangi dairenin
 * nerede olacağına karar vermez (ilke 7 ve "sistem senaryo üretir, karar
 * vermez" ilkesinin bölümleme karşılığı).
 *
 * Dönüş: parça indeksi → birim indeksi (eşleşmeyen parça için null).
 */
export function proposeAssignment(
  pieceAreas: readonly number[],
  targets: readonly (number | null)[],
): (number | null)[] {
  const pieceOrder = pieceAreas
    .map((area, i) => ({ area, i }))
    .sort((a, b) => (b.area !== a.area ? b.area - a.area : a.i - b.i));

  // Hedefi BİLİNMEYEN birim sıralamaya girmez: sıfır sayılsaydı en sona
  // düşer ve en küçük parçayı alırdı — uydurulmuş bir karar olurdu.
  const unitOrder = targets
    .map((t, i) => ({ t, i }))
    .filter((e): e is { t: number; i: number } => e.t !== null)
    .sort((a, b) => (b.t !== a.t ? b.t - a.t : a.i - b.i));

  const result: (number | null)[] = pieceAreas.map(() => null);
  for (let k = 0; k < Math.min(pieceOrder.length, unitOrder.length); k += 1) {
    result[pieceOrder[k]!.i] = unitOrder[k]!.i;
  }
  return result;
}

/** Boş MultiPolygon — `region` hesaplanamadığında kullanılır. */
export const EMPTY_REGION: LocalMultiPolygon = multiPolygon([]);

/**
 * Plakadan çekirdek ve sirkülasyonu düşer.
 *
 * Manuel ve otomatik mod AYNI kalan alandan başlar; bu fonksiyon ikisinin de
 * ortak ilk adımıdır.
 */
export function remainderOf(
  plate: LocalPolygon | null,
  core: LocalPolygon | null,
  circulation: readonly LocalPolygon[],
): LocalMultiPolygon {
  if (!plate) return EMPTY_REGION;
  const blockers = [...(core ? [core] : []), ...circulation];
  if (blockers.length === 0) return multiPolygon([plate.coordinates]);
  return booleanOp([plate], blockers, "difference");
}

/** Yerel metrik poligon üretmek için küçük yardımcı (tuval tarafında da kullanılır). */
export function localPolygon(ring: readonly LocalPoint[]): LocalPolygon {
  return polygon([[...ring, ring[0]!]]);
}

export { LOCAL_CRS };
