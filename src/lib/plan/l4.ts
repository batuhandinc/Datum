import {
  booleanOp,
  boundingBox,
  polygon,
  polygonArea,
  rotatePolygon,
  principalAxis,
  ringCentroid,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import { toPolygons } from "@/lib/subdivide/kernel";
import {
  outerSegments,
  overlapOf,
  segmentLength,
  sharedBoundaryRuns,
  type Segment,
} from "@/lib/subdivide/boundary";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * L4 — DETAYLANDIRMA (saf hesap).
 *
 * `kat-plani-uretim-mimarisi.md` §2 L4: duvar kalınlıkları, kapılar,
 * pencereler, kolon aksları.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DUVAR TÜRETİLİR, ÇİZİLMEZ.
 *
 * Kullanıcı duvar çizmez; iki mekanın PAYLAŞTIĞI SINIR duvara dönüşür.
 * Tek doğruluk kaynağı geometri kalır. Duvar ayrıca çizilebilseydi mekan
 * sınırı ile duvar ekseni birbirinden bağımsız iki gerçek olurdu ve
 * hangisinin doğru olduğu TANIMSIZ kalırdı.
 *
 * TİP DE ÇİZİLMEZ, İLİŞKİDEN ÇIKAR: dış halkaya değen kenar `dis`, ıslak
 * mekanın sınırı `islakHacim`, şaft sınırı `saft`, iki BİRİMİ ayıran
 * `birimAyirici`, kalanı `ic`.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `netArea` ve `volume` ÜRETİLMEZ: açıklık düşümü KALEM BAZINDA merkezî
 * tanımlıdır (ilke 6) ve duvarın net yüzeyi kaleme göre değişir. İP-5 hesaplar.
 *
 * KOLON AKSI KABADIR. Amacı otopark verimi doğrulaması ve yapısal ampirik
 * katsayıya girdi vermek; gerçek statik hesap DEĞİLDİR ve kolon kesiti
 * hesaplanmaz.
 */

export type WallType = "dis" | "ic" | "islakHacim" | "saft" | "birimAyirici";
export type OpeningType = "pencere" | "kapi" | "balkonKapisi";

export interface L4Space {
  /** `Space.id` — üretilen duvar ve açıklıklar buna bağlanır. */
  readonly spaceId: string;
  readonly layoutKey: string | null;
  readonly spaceType: string;
  /** Birim kimliği — `birimAyirici` tespiti için. */
  readonly unitId: string;
  readonly geometry: LocalPolygon | null;
  /** Islak hacim mi? `SpaceTypeCategoryMap`'ten türer, koda gömülü değil. */
  readonly isWetArea: boolean;
}

export interface L4Wall {
  /** Kat içinde TEKİL kararlı anahtar. Birim kimliği TAŞIR. */
  readonly wallKey: string;
  readonly wallType: WallType;
  /** Duvarın EKSENİ (iki uçlu). */
  readonly geometry: Segment;
  readonly length: number;
  /** `BuildingElementRule`'dan; kural yoksa null ve duvar ÜRETİLMEZ. */
  readonly thickness: number | null;
  readonly spaceAId: string;
  readonly spaceBId: string | null;
}

export interface L4Opening {
  readonly wallKey: string;
  readonly spaceId: string;
  readonly adjacentSpaceId: string | null;
  readonly openingType: OpeningType;
  readonly isExterior: boolean;
  readonly width: number;
  readonly height: number;
}

export interface L4ColumnGrid {
  readonly spacingX: number;
  readonly spacingY: number;
  /** Aks çizgileri (yerel metrik). */
  readonly axes: readonly Segment[];
  readonly columnCount: number;
}

/** `BuildingElementRule`'un okunmuş hâli — hepsi nullable. */
export interface ElementRules {
  /** `wallType` → kalınlık (m). */
  readonly wallThickness: ReadonlyMap<WallType, number>;
  /** `spaceType` → aydınlatma oranı (pencere alanı ÷ taban alanı). */
  readonly daylightRatio: ReadonlyMap<string, number>;
  readonly minDoorWidth: number | null;
  readonly columnSpanX: number | null;
  readonly columnSpanY: number | null;
}

export interface L4Input {
  /** Kat plakası — dış duvar tespiti için. */
  readonly plate: LocalPolygon | null;
  /** Şaft ayak izleri — `saft` tipi tespiti için. */
  readonly shafts: readonly LocalPolygon[];
  readonly spaces: readonly L4Space[];
  readonly rules: ElementRules;
  /** Pencere yüksekliği — mekan net yüksekliğinden türer; yoksa null. */
  readonly clearHeight: number | null;
}

export interface L4Output {
  readonly walls: readonly L4Wall[];
  readonly openings: readonly L4Opening[];
  readonly columnGrid: L4ColumnGrid | null;
  readonly warnings: readonly Warning[];
}

const round = (v: number, d = 3): number => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/**
 * Duvar tipi MEKAN İLİŞKİSİNDEN çıkar.
 *
 * Sıra önemlidir: bir kenar hem dış hem ıslak olabilir; dış kazanır çünkü
 * kalınlığı ve yalıtımı belirleyen odur.
 */
function classifyWall(
  a: L4Space,
  b: L4Space | null,
  run: Segment,
  plateEdges: readonly Segment[],
  shaftEdges: readonly Segment[],
): WallType {
  if (plateEdges.some((e) => overlapOf(e, run) !== null)) return "dis";
  if (shaftEdges.some((e) => overlapOf(e, run) !== null)) return "saft";
  if (b === null) return "dis";
  if (a.unitId !== b.unitId) return "birimAyirici";
  if (a.isWetArea || b.isWetArea) return "islakHacim";
  return "ic";
}

/**
 * Kararlı duvar anahtarı.
 *
 * BİRİM KİMLİĞİ TAŞIR: mekan anahtarı ŞABLON içinde tekildir, kat içinde
 * değil. Aynı katta aynı tipten dört birim varsa dördü de `salon|hol#0`
 * üretirdi ve `@@unique([floorId, wallKey])` patlardı. Kimlik kararlı olmazsa
 * her yeniden çözümde `QuantityLine.sourceObjectId` bağı çürür (ilke 10).
 *
 * Uçlar SIRALANIR ki `wall(a,b)` ile `wall(b,a)` aynı anahtarı üretsin.
 */
function wallKeyOf(a: L4Space, b: L4Space | null, index: number): string {
  const left = `${a.unitId}:${a.layoutKey ?? a.spaceId}`;
  const right = b === null ? "EXT" : `${b.unitId}:${b.layoutKey ?? b.spaceId}`;
  const [x, y] = left <= right ? [left, right] : [right, left];
  return `${x}|${y}#${index}`;
}

export function computeL4(input: L4Input): L4Output {
  const w = new WarningCollector();
  const placed = input.spaces.filter((s) => s.geometry !== null);

  if (placed.length === 0) {
    return { walls: [], openings: [], columnGrid: null, warnings: w.all };
  }
  if (input.rules.wallThickness.size === 0) {
    // Kalınlık YEREL KURALDIR (iklim bölgesi, yapı geleneği). Uydurmak yerine
    // duvar ÜRETİLMEZ — offsetJoinType ve areaPerSpace ile aynı sertlik.
    w.addOnce("BUILDING_ELEMENT_RULE_MISSING", { count: 0 });
    return { walls: [], openings: [], columnGrid: null, warnings: w.all };
  }

  const plateEdges = input.plate ? outerSegments(input.plate) : [];
  const shaftEdges = input.shafts.flatMap((s) => outerSegments(s));

  // --- Duvarlar: mekan ÇİFTLERİNİN paylaştığı kenarlar ---
  const walls: L4Wall[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]!;
      const b = placed[j]!;
      const runs = sharedBoundaryRuns(a.geometry!, b.geometry!);
      runs.forEach((run, k) => {
        const type = classifyWall(a, b, run, plateEdges, shaftEdges);
        const key = wallKeyOf(a, b, k);
        if (seenPairs.has(key)) return;
        seenPairs.add(key);
        walls.push({
          wallKey: key,
          wallType: type,
          geometry: run,
          length: round(segmentLength(run)),
          thickness: input.rules.wallThickness.get(type) ?? null,
          spaceAId: a.spaceId,
          spaceBId: b.spaceId,
        });
      });
    }
  }

  // --- Dış duvarlar: mekanın plakaya değen kenarları ---
  for (const s of placed) {
    outerSegments(s.geometry!).forEach((edge, k) => {
      for (const pe of plateEdges) {
        const run = overlapOf(pe, edge);
        if (run === null) continue;
        const key = wallKeyOf(s, null, k);
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        walls.push({
          wallKey: key,
          wallType: "dis",
          geometry: run,
          length: round(segmentLength(run)),
          thickness: input.rules.wallThickness.get("dis") ?? null,
          spaceAId: s.spaceId,
          spaceBId: null,
        });
      }
    });
  }

  // --- Açıklıklar ---
  const openings: L4Opening[] = [];
  const doorWidth = input.rules.minDoorWidth;
  const height = input.clearHeight;

  if (doorWidth === null) {
    // Kapı ölçüsü Türkiye'de YANGIN ve ERİŞİLEBİLİRLİK mevzuatıdır.
    // Kodda varsayılan olamaz; kural yoksa açıklık üretilmez.
    w.addOnce("L4_DOOR_RULE_MISSING");
  }
  if (height === null) {
    w.addOnce("L4_CLEAR_HEIGHT_MISSING");
  }

  if (doorWidth !== null && height !== null) {
    for (const wall of walls) {
      const spaceA = placed.find((s) => s.spaceId === wall.spaceAId)!;

      if (wall.wallType === "dis") {
        // PENCERE: aydınlatma oranı × taban alanı. Kural yoksa üretilmez.
        const ratio = input.rules.daylightRatio.get(spaceA.spaceType);
        if (ratio === undefined) continue;
        const needed = polygonArea(spaceA.geometry!) * ratio;
        const windowWidth = Math.min(wall.length * 0.8, needed / height);
        if (windowWidth <= 0) continue;
        openings.push({
          wallKey: wall.wallKey,
          spaceId: wall.spaceAId,
          adjacentSpaceId: null,
          openingType: spaceA.spaceType === "balkon" ? "balkonKapisi" : "pencere",
          isExterior: true,
          width: round(windowWidth, 2),
          height: round(height, 2),
        });
        continue;
      }

      // KAPI: iki mekan komşuysa ve duvar kapı genişliğini taşıyorsa.
      // Şaft duvarında kapı olmaz.
      if (wall.wallType === "saft" || wall.spaceBId === null) continue;
      if (wall.length < doorWidth) continue;
      openings.push({
        wallKey: wall.wallKey,
        spaceId: wall.spaceAId,
        adjacentSpaceId: wall.spaceBId,
        openingType: "kapi",
        isExterior: false,
        width: round(doorWidth, 2),
        height: round(Math.min(height, 2.1), 2),
      });
    }
  }

  // --- Kolon aks ızgarası ---
  let columnGrid: L4ColumnGrid | null = null;
  const { columnSpanX, columnSpanY } = input.rules;
  if (input.plate && columnSpanX !== null && columnSpanY !== null) {
    columnGrid = buildGrid(input.plate, columnSpanX, columnSpanY);
  } else if (columnSpanX === null || columnSpanY === null) {
    w.addOnce("L4_COLUMN_SPAN_MISSING");
  }

  return { walls, openings, columnGrid, warnings: w.all };
}

/**
 * KABA aks ızgarası — plakanın ANA EKSENİNE hizalı.
 *
 * Eksen hizalı bir ızgara, grid'e eğik bir plakada cepheyle açı yapar ve
 * kolonlar duvarlara denk gelmez. Ana eksene hizalamak mimari olarak da
 * doğrudur: aks düzeni cepheye paraleldir.
 */
function buildGrid(plate: LocalPolygon, spanX: number, spanY: number): L4ColumnGrid {
  const angle = principalAxis(plate)?.angle ?? 0;
  const centre = ringCentroid(plate.coordinates[0]!);
  // Plakayı eksen hizasına döndür, ızgarayı orada kur, geri döndür.
  const aligned = rotatePolygon(plate, -angle, centre);
  const bb = boundingBox(aligned);

  const axes: Segment[] = [];
  let columnCount = 0;

  const back = (p: LocalPoint): LocalPoint => {
    const rad = (angle * Math.PI) / 180;
    const dx = p[0] - centre[0];
    const dy = p[1] - centre[1];
    return [
      centre[0] + dx * Math.cos(rad) - dy * Math.sin(rad),
      centre[1] + dx * Math.sin(rad) + dy * Math.cos(rad),
    ];
  };

  const xs: number[] = [];
  for (let x = bb.minX; x <= bb.maxX + 1e-9; x += spanX) xs.push(x);
  const ys: number[] = [];
  for (let y = bb.minY; y <= bb.maxY + 1e-9; y += spanY) ys.push(y);

  for (const x of xs) axes.push([back([x, bb.minY]), back([x, bb.maxY])]);
  for (const y of ys) axes.push([back([bb.minX, y]), back([bb.maxX, y])]);

  // Kolon sayısı: ızgara kesişimlerinin plakanın İÇİNDE kalanları.
  for (const x of xs) {
    for (const y of ys) {
      const p = back([x, y]);
      const probe = polygon([
        [
          [p[0] - 0.05, p[1] - 0.05],
          [p[0] + 0.05, p[1] - 0.05],
          [p[0] + 0.05, p[1] + 0.05],
          [p[0] - 0.05, p[1] + 0.05],
          [p[0] - 0.05, p[1] - 0.05],
        ],
      ]);
      if (toPolygons(booleanOp([probe], [plate], "intersection")).length > 0) columnCount += 1;
    }
  }

  return { spacingX: spanX, spacingY: spanY, axes, columnCount };
}

/**
 * KOLON AKSI OTOPARK KATSAYISINI DOĞRULAR, DEĞİŞTİRMEZ.
 *
 * İP-3'ten devreden söz (`etut-veri-modeli.md` §12.5): "İP-4'te kolon aksları
 * geldiğinde geometrik yerleşim bu katsayıyı DEĞİŞTİRMEZ, DOĞRULAR: fiili
 * yerleşim katsayıdan belirgin saparsa uyarı üretilir. Otorite katsayıda kalır."
 *
 * Ölçüm: aks ızgarasının bir gözü (spanX × spanY) kaç araç alabilir. Karşılık
 * gelen alan/araç değeri paketin `areaPerSpace`'i ile karşılaştırılır.
 *
 * Dönen değer bir ÖNERİ DEĞİL, bir TEŞHİSTİR: katsayı hiçbir koşulda
 * değişmez.
 */
export function verifyParkingCoefficient(
  grid: L4ColumnGrid | null,
  areaPerSpace: number | null,
  spaceWidth: number | null,
  spaceLength: number | null,
  /** Sapmanın anlamlı sayılacağı oran — algoritmik eşik, mevzuat değil. */
  significantDeviation = 0.2,
): { measured: number | null; deviation: number | null; warnings: readonly Warning[] } {
  const w = new WarningCollector();
  if (grid === null || areaPerSpace === null || spaceWidth === null || spaceLength === null) {
    return { measured: null, deviation: null, warnings: w.all };
  }

  // Bir gözde kaç park yeri: gözün iki yönünde de tam sığan araç sayısı.
  const perBayX = Math.floor(grid.spacingX / spaceWidth);
  const perBayY = Math.floor(grid.spacingY / spaceLength);
  const perBay = Math.max(perBayX * 1, perBayY * 1);
  if (perBay <= 0) {
    return { measured: null, deviation: null, warnings: w.all };
  }

  const bayArea = grid.spacingX * grid.spacingY;
  const measured = bayArea / perBay;
  const deviation = (measured - areaPerSpace) / areaPerSpace;

  if (Math.abs(deviation) > significantDeviation) {
    w.add("L4_PARKING_COEFFICIENT_DEVIATION", {
      measured: round(measured, 2),
      coefficient: areaPerSpace,
      deviation: round(deviation * 100, 1),
    });
  }

  return { measured: round(measured, 2), deviation: round(deviation, 4), warnings: w.all };
}
