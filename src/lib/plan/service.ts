import type { PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { polygon, polygonArea, ringPerimeter, type LocalPolygon } from "@/lib/geometry";
import type { Warning } from "@/lib/warnings";
import { computeL2, type CoreStrategy, type L2Output } from "./l2";
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
