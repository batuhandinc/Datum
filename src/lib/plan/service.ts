import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { polygon, polygonArea, ringPerimeter, type LocalPolygon } from "@/lib/geometry";
import type { Warning } from "@/lib/warnings";
import { parseLocalPolygon } from "@/lib/geometry/schema";
import { rectangle } from "@/lib/geometry";
import { shaftAbsolutePosition } from "@/lib/core/l1";
import { outerSegments } from "@/lib/subdivide/boundary";
import { computeL2, type CoreStrategy, type L2Output } from "./l2";
import { computeL3, type L3Placement } from "./l3";
import { parseLayoutRecipe, validateRecipe } from "./template";
import { loadPlanContext, writeCirculation, writePartition } from "./repository";

/**
 * L2 SERVİS KATMANI — okur, çağırır, yazar.
 *
 * `envelope/service.ts` ve `core/service.ts` desenini birebir taklit eder:
 * hesap SAF kalır, bu dosya veritabanına dokunur.
 *
 * Kural okuma YALNIZCA `createRuleReader()` üzerinden; kural tabloları
 * `ORG_SCOPED_MODELS`'te değil ve doğrudan sorgu hem kiracı hem sürüm
 * filtresinden kaçar (bir mimari test bunu yasaklıyor).
 */

export interface L2ComputeResult extends L2Output {
  readonly projectId: string;
  readonly floorId: string | null;
  readonly stored: boolean;
}

const num = (d: { toString(): string } | null): number | null =>
  d === null ? null : Number(d.toString());

/** Zarfın en büyük parçası — L1 ile AYNI seçim. */
function largestPart(
  mp: { coordinates: readonly (readonly (readonly (readonly [number, number])[])[])[] } | null,
): LocalPolygon | null {
  if (!mp || mp.coordinates.length === 0) return null;
  let best = mp.coordinates[0]!;
  let bestArea = -Infinity;
  for (const rings of mp.coordinates) {
    const area = polygonArea(polygon(rings));
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  return polygon(best);
}

/**
 * Bir katı OTOMATİK bölümler ve sonucu saklar.
 *
 * Yazma `writePartition(..., "otomatik")` üzerinden gider, yani
 * `geometryComputedValue`'ya. Kullanıcının manuel çizimi `OverrideValue`'da
 * durduğu için `COALESCE` onu seçmeye devam eder — otomatik koşu kullanıcının
 * işini YOK ETMEZ. Manuel çizimi geri almak isteyen "manuel bölümlemeyi
 * kaldır" der ve hesaplanan değer görünür hale gelir.
 */
export async function computeAndStoreL2(
  projectId: string,
  floorId: string,
  client: PrismaClient = prisma,
): Promise<L2ComputeResult> {
  // KİRACILIK AÇIKÇA KURULUR, dolaylı değil. Aşağıdaki yardımcıların hepsi
  // kendi kontrolünü yapıyor; ama giriş noktasında da yapmak, bu fonksiyonun
  // ileride kiracılık kurmayan bir yardımcı çağırmasına karşı savunmadır.
  // İP-3'te `startup/questions.ts` için verilen kararın aynısı; bir mimari
  // test ham `prisma` kullanan her modülden bunu istiyor.
  const visible = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!visible) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const context = await loadPlanContext(projectId, client);
  const floor = context.floors.find((f) => f.floorId === floorId) ?? null;

  const reader = await createRuleReader(projectId, client);
  const [layoutRule, coreRule] = await Promise.all([
    reader.unitLayoutRule(),
    reader.coreRule(),
  ]);

  const plate = largestPart(context.envelope as never);

  // Strateji `Core.coreStrategy`'den gelir — L1 önerir, kullanıcı ezer.
  // KÖKTEN okunur (`loadPlanContext` içinde): ayrı bir `block.findFirst`
  // kiracılığı kurmaz ve alt varlık sorgusu kiracı filtresinden kaçar.
  const coreStrategy = context.coreStrategy as CoreStrategy | null;

  const result = computeL2({
    plate,
    core: context.core,
    coreStrategy,
    minCirculationWidth: coreRule ? num(coreRule.minCirculationWidth) : null,
    grossToNetFactor: layoutRule ? num(layoutRule.grossToNetFactor) : null,
    units: (floor?.units ?? []).map((u) => ({
      unitId: u.unitId,
      unitNo: u.unitNo,
      targetArea: u.targetArea,
    })),
  });

  const warnings: Warning[] = [...reader.warnings, ...result.warnings];

  if (!floor) {
    return { ...result, warnings, projectId, floorId: null, stored: false };
  }

  // Sirkülasyon önce yazılır: birimler ona erişimle tanımlıdır.
  await writeCirculation(
    projectId,
    floorId,
    result.circulation.map((c) => ({
      spaceType: "katHolu",
      geometry: c,
      area: polygonArea(c),
      perimeter: ringPerimeter(c.coordinates[0]!),
    })),
    client,
  );

  await writePartition(
    projectId,
    result.placements.map((p) => ({ unitId: p.unitId, geometry: p.geometry })),
    "otomatik",
    client,
  );

  return { ...result, warnings, projectId, floorId, stored: true };
}

// ===========================================================================
// L3 — birim içi mekan yerleşimi
// ===========================================================================

/**
 * Bir birimin mekanlarını şablon reçetesine göre yerleştirir ve saklar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * `layoutKey` KÖPRÜSÜ.
 *
 * `instantiateUnitType` mekanları yalnızca `spaceType` + `name` + `area` ile
 * açıyor; `layoutKey` taşımıyorlar. İlk koşuda reçete yaprakları mevcut
 * satırlara TİP + SIRA ile eşlenir ve anahtar YAZILIR; sonraki koşular
 * anahtarla eşler.
 *
 * Anahtar olmadan: örnek 3+1'de `yatak1` ve `yatak2` ikisi de `yatakOdasi`
 * tipindedir ve her yeniden çözümde geometrileri, çevreleri, kaplamaları
 * SESSİZCE yer değiştirirdi. Ayrıca `QuantityLine.sourceObjectId` bağı çürür
 * ve rapor izi kopardı (ilke 10).
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function computeAndStoreL3(
  projectId: string,
  unitId: string,
  client: PrismaClient = prisma,
): Promise<{ placements: L3Placement[]; warnings: Warning[]; stored: boolean }> {
  const visible = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!visible) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  // Birim KÖKTEN doğrulanır: alt varlıklar organizationId taşımaz.
  const unit = await client.unit.findFirst({
    where: { id: unitId, floor: { block: { projectId } } },
    include: {
      spaces: { orderBy: { id: "asc" } },
      floor: { include: { block: { include: { core: { include: { shafts: true } } } } } },
    },
  });
  if (!unit) throw new Error(`DATUM_NOT_FOUND: bağımsız bölüm bulunamadı: ${unitId}`);

  const w: Warning[] = [];
  const reader = await createRuleReader(projectId, client);
  const elementRules = await reader.buildingElementRules();
  w.push(...reader.warnings);

  // Reçete PROJEDEKİ UnitType'tan gelir (kütüphaneden kopyalanmıştır ve
  // projede DONMUŞTUR) — kütüphaneyi iyileştirmek biten projeyi değiştirmez.
  const unitType = unit.unitTypeCode
    ? await client.unitType.findFirst({
        where: { projectId, unitTypeCode: unit.unitTypeCode },
        select: { layoutRecipe: true },
      })
    : null;
  const recipe = parseLayoutRecipe(unitType?.layoutRecipe);

  if (recipe !== null) {
    const problems = validateRecipe(recipe);
    if (problems.length > 0) {
      // Bozuk şablon bir KISIT İHLALİ değil, GEÇERSİZ GİRDİdir: plan üretilmez.
      return {
        placements: [],
        warnings: [...w, { code: "L3_RECIPE_INVALID", params: { problems: problems.join(", ") } }],
        stored: false,
      };
    }
  }

  const core = parseLocalPolygon(unit.floor.block.core?.geometry);
  const shaftRows = unit.floor.block.core?.shafts ?? [];

  // Şaft ayak izi: konum + ölçü İKİSİ DE gerekir. Biri eksikse şaft
  // ÇİZİLMEZ ve L3'ün ıslak hacim iddiası "değerlendirilemedi" kalır —
  // sıfır sayıp çekirdek merkezine oturtmak uydurma bir konum olurdu.
  const shafts: LocalPolygon[] = [];
  let shaftUnknown = false;
  for (const s of shaftRows) {
    const ox = num(s.offsetX);
    const oy = num(s.offsetY);
    const sw = num(s.width);
    const sd = num(s.depth);
    if (core === null || ox === null || oy === null || sw === null || sd === null) {
      shaftUnknown = true;
      continue;
    }
    const [ax, ay] = shaftAbsolutePosition(core, ox, oy);
    shafts.push(rectangle(ax, ay, sw, sd));
  }
  // Şaft HİÇ YOKSA da uyarı: "banyo şafta bitişik" iddiası değerlendirilemez.
  // Sessiz kalmak, kullanıcının ıslak hacimlerin toplandığını sanmasına yol açar.
  if (shaftUnknown || shafts.length === 0) w.push({ code: "L3_SHAFT_POSITION_UNKNOWN" });

  const geometry = parseLocalPolygon(unit.geometry);
  const circulationEdges = core ? outerSegments(core) : [];
  const facadeEdges = geometry ? outerSegments(geometry) : [];

  const known = unit.spaces
    .map((s) => (s.area === null ? null : Number(s.area)))
    .filter((a): a is number => a !== null);
  const targetArea = known.length === 0 ? null : known.reduce((a, b) => a + b, 0);

  const result = computeL3({
    unit: geometry,
    targetArea,
    recipe,
    entryEdges: circulationEdges,
    facadeEdges,
    shafts,
    dimensionRules: elementRules
      .filter((r) => r.spaceType !== null)
      .map((r) => ({
        spaceType: String(r.spaceType),
        minArea: num(r.minArea),
        minClearWidth: num(r.minClearWidth),
      })),
  });
  w.push(...result.warnings);

  if (result.placements.length === 0) {
    return { placements: [], warnings: w, stored: false };
  }

  // --- Eşleştirme ve yazma ---
  const byKey = new Map(unit.spaces.filter((s) => s.layoutKey).map((s) => [s.layoutKey!, s]));
  const unassigned = unit.spaces.filter((s) => !s.layoutKey);

  const matched = new Set<string>();

  for (const p of result.placements) {
    let row = byKey.get(p.layoutKey) ?? null;
    if (row === null) {
      const i = unassigned.findIndex((s) => s.spaceType === p.spaceType);
      if (i >= 0) row = unassigned.splice(i, 1)[0]!;
    }
    if (row === null) {
      // REÇETEDE VAR, PROGRAMDA YOK. Sessizce atlanırsa şablon "3+1" der,
      // ortaya 2+1 çıkar ve kimse fark etmez.
      w.push({
        code: "L3_SPACE_NOT_IN_PROGRAM",
        params: { layoutKey: p.layoutKey, spaceType: p.spaceType },
      });
      continue;
    }
    matched.add(row.id);

    await client.space.update({
      where: { id: row.id },
      data: {
        layoutKey: p.layoutKey,
        geometryComputedValue:
          p.geometry === null
            ? Prisma.DbNull
            : (p.geometry as unknown as Prisma.InputJsonValue),
        // Çevre G3'ten türer; G1'e düşen mekanda null bırakılır ve
        // SpaceShapeFactorRule'dan türetilmesi İP-5'e kalır.
        perimeterComputedValue:
          p.geometry === null ? null : round3(ringPerimeter(p.geometry.coordinates[0]!)),
      },
    });
  }

  // PROGRAMDA VAR, REÇETEDE YOK. Bayat geometri TEMİZLENİR: önceki koşudan
  // kalan poligon artık var olmayan bir yerleşimi tarif ederdi ve İP-5 metrajı
  // onu ölçerdi. L0 ve L1 de aynı disiplini uyguluyor.
  for (const row of unit.spaces) {
    if (matched.has(row.id)) continue;
    w.push({ code: "L3_SPACE_NOT_IN_RECIPE", params: { spaceType: String(row.spaceType) } });
    if (row.geometryComputedValue !== null || row.perimeterComputedValue !== null) {
      await client.space.update({
        where: { id: row.id },
        data: { geometryComputedValue: Prisma.DbNull, perimeterComputedValue: null },
      });
    }
  }

  return { placements: [...result.placements], warnings: w, stored: true };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
