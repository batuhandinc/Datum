import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { parseLocalMultiPolygon, parseLocalPolygon } from "@/lib/geometry/schema";
import type { LocalMultiPolygon, LocalPolygon } from "@/lib/geometry";
import { polygonArea } from "@/lib/geometry";

/**
 * PLAN YAZMA KATMANI — manuel ve otomatik modun TEK yazma yolu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * "MANUEL ≡ OTOMATİK" GARANTİSİNİN BİRİNCİ KATMANI.
 *
 * İki mod da `writePartition`'dan geçer; ikinci bir yazıcı yoktur. Fark
 * yalnızca `source` parametresidir ve o da HANGİ KOLONA yazıldığını belirler:
 *
 *   otomatik → geometryComputedValue
 *   manuel   → geometryOverrideValue + gerekçe
 *
 * `Unit.geometry` (GENERATED) her iki durumda AYNI kolondur; L3, L4 ve metraj
 * hangisinden geldiğini ne bilir ne umursar.
 *
 * EZME BURADA YALNIZCA İŞARETLEME DEĞİL, TAŞIYICIDIR: kullanıcının çizdiği
 * bölümleme `OverrideValue`'da durduğu için L2 yeniden koştuğunda YOK EDİLMEZ —
 * `COALESCE` ezmeyi seçer. Manuel çizimi `ComputedValue`'ya yazmak, kullanıcının
 * işini bir sonraki hesapta sessizce silmek olurdu.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * KİRACILIK: alt varlıklar `organizationId` taşımaz, bu yüzden her yazma
 * KÖKTEN doğrulanır. Bir mimari test ham `prisma` kullanımını yasaklıyor.
 *
 * KESME ÇİZGİLERİ SAKLANMAZ — açık karar: birim poligonları saklanınca
 * kesmeler `sharedBoundaryRuns` ile geri türetilebilir; ayrı bir kolon
 * spekülatif olurdu ve aynı bölümlemeyi veren sonsuz kesme kümesi vardır.
 * Mevcut bir sınırı OYNATMAK İP-8'in işidir.
 */

type Client = PrismaClient;

async function assertProject(projectId: string, client: Client): Promise<void> {
  const project = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
}

/** Planın kaynağı — hangi kolona yazılacağını belirler. */
export type PlanSource = "otomatik" | "manuel";

export interface UnitTarget {
  readonly unitId: string;
  readonly unitNo: string | null;
  readonly unitTypeCode: string | null;
  /**
   * NET hedef alan = `Σ Space.area`.
   *
   * ŞABLONDAN DEĞİL, BİRİMİN KENDİ PROGRAMINDAN okunur. `instantiateUnitType`
   * şablon mekanlarını birimin kendi `Space` satırlarına KOPYALIYOR ve
   * `divergedUnits()` tam da bu kopyaların şablondan ayrışmasını izlemek için
   * var. Şablondan okumak, sistemin bilerek takip ettiği ayrışmayı görmezden
   * gelmek olurdu — kullanıcı bir birimi 119 m²'den 140 m²'ye çıkardığında
   * plan motoru ona hâlâ 119 m² keserdi.
   *
   * Hiç mekanı yoksa `null` — SIFIR DEĞİL.
   */
  readonly targetArea: number | null;
  readonly geometry: LocalPolygon | null;
  /** Poligon ezmeden mi geldi (yani manuel mi çizildi)? */
  readonly isManual: boolean;
}

export interface FloorPlanContext {
  readonly floorId: string;
  readonly floorNo: number;
  readonly floorType: string;
  readonly isLocked: boolean;
  readonly templateFloorId: string | null;
  readonly units: readonly UnitTarget[];
}

export interface PlanContext {
  readonly projectId: string;
  readonly blockId: string | null;
  /** L0'ın ürettiği zarf. */
  readonly envelope: LocalMultiPolygon | null;
  /** L1'in ürettiği çekirdek. */
  readonly core: LocalPolygon | null;
  readonly circulation: readonly LocalPolygon[];
  readonly floors: readonly FloorPlanContext[];
}

/**
 * Plan ekranının ihtiyaç duyduğu her şeyi TEK sorguda, KÖKTEN okur.
 */
export async function loadPlanContext(
  projectId: string,
  client: Client = prisma,
): Promise<PlanContext> {
  const scoped = scopedPrisma(client, currentOrganizationId());
  const project = await scoped.project.findUnique({
    where: { id: projectId },
    include: {
      parcel: { include: { zoningData: true } },
      blocks: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: {
          core: true,
          floors: {
            orderBy: { floorNo: "asc" },
            include: {
              commonSpaces: true,
              units: {
                orderBy: { unitNo: "asc" },
                include: { spaces: { select: { area: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const block = project.blocks[0] ?? null;
  const zoning = project.parcel?.zoningData ?? null;

  const floors: FloorPlanContext[] = (block?.floors ?? []).map((f) => ({
    floorId: f.id,
    floorNo: f.floorNo,
    floorType: f.floorType,
    isLocked: f.isLocked,
    templateFloorId: f.templateFloorId,
    units: f.units.map((u) => {
      // Mekanı olmayan birimin hedefi BİLİNMEZ, sıfır değil.
      const areas = u.spaces.map((s) => (s.area === null ? null : Number(s.area)));
      const known = areas.filter((a): a is number => a !== null);
      const targetArea = u.spaces.length === 0 || known.length === 0 ? null : sum(known);
      return {
        unitId: u.id,
        unitNo: u.unitNo,
        unitTypeCode: u.unitTypeCode,
        targetArea,
        geometry: parseLocalPolygon(u.geometry),
        isManual: u.geometryOverrideValue !== null,
      };
    }),
  }));

  const circulation = (block?.floors ?? [])
    .flatMap((f) => f.commonSpaces)
    .map((c) => parseLocalPolygon(c.geometry))
    .filter((p): p is LocalPolygon => p !== null);

  return {
    projectId,
    blockId: block?.id ?? null,
    envelope: parseLocalMultiPolygon(zoning?.buildableEnvelope),
    core: parseLocalPolygon(block?.core?.geometry),
    circulation,
    floors,
  };
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export interface UnitAssignment {
  readonly unitId: string;
  /** null = birime poligon düşmedi. */
  readonly geometry: LocalPolygon | null;
}

/**
 * Bölümlemeyi yazar — İKİ MODUN DA TEK YOLU.
 *
 * BAYAT GEOMETRİ TEMİZLENİR: poligon düşmeyen birimin ilgili kolonu açıkça
 * `DbNull`'a çekilir. `computeAndStoreL0` ve `computeAndStoreL1` de aynısını
 * yapıyor; yapılmasaydı önceki koşunun poligonu hayatta kalır ve artık var
 * olmayan bir plakayı tarif ederdi — `Unit.grossArea` ondan türetildiği için
 * metraj sessizce bayat bir plandan çıkardı.
 */
export async function writePartition(
  projectId: string,
  assignments: readonly UnitAssignment[],
  source: PlanSource,
  client: Client = prisma,
  reason = "Manuel bölümleme",
): Promise<void> {
  await assertProject(projectId, client);
  if (assignments.length === 0) return;

  // Birimlerin gerçekten bu projeye ait olduğunu KÖKTEN doğrula.
  const owned = await client.unit.findMany({
    where: {
      id: { in: assignments.map((a) => a.unitId) },
      floor: { block: { projectId } },
    },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((u) => u.id));

  for (const a of assignments) {
    if (!ownedIds.has(a.unitId)) continue;

    const geometry =
      a.geometry === null ? Prisma.DbNull : (a.geometry as unknown as Prisma.InputJsonValue);
    const grossArea = a.geometry === null ? null : round3(polygonArea(a.geometry));

    if (source === "manuel") {
      await client.unit.update({
        where: { id: a.unitId },
        data: {
          geometryOverrideValue: geometry,
          geometryOverrideReason: a.geometry === null ? null : reason,
          // Brüt alan poligondan TÜRER; ezilen geometri ezilen alanı doğurur.
          grossAreaOverrideValue: grossArea,
          grossAreaOverrideReason: a.geometry === null ? null : reason,
        },
      });
    } else {
      await client.unit.update({
        where: { id: a.unitId },
        data: {
          geometryComputedValue: geometry,
          grossAreaComputedValue: grossArea,
        },
      });
    }
  }
}

/**
 * Manuel bölümlemeyi KALDIRIR — ezme silinir, hesaplanan değer geri gelir.
 *
 * Veri kaybı değildir: `ComputedValue` yerinde durur, `COALESCE` yeniden onu
 * seçer. "Kilit açılınca önceki veri korunur" ile aynı disiplin.
 */
export async function clearManualPartition(
  projectId: string,
  floorId: string,
  client: Client = prisma,
): Promise<void> {
  await assertProject(projectId, client);
  await client.unit.updateMany({
    where: { floorId, floor: { block: { projectId } } },
    data: {
      geometryOverrideValue: Prisma.DbNull,
      geometryOverrideReason: null,
      grossAreaOverrideValue: null,
      grossAreaOverrideReason: null,
    },
  });
}

/** Sirkülasyon poligonlarını yazar (L2 üretir). */
export async function writeCirculation(
  projectId: string,
  floorId: string,
  spaces: readonly { spaceType: string; geometry: LocalPolygon; area: number; perimeter: number }[],
  client: Client = prisma,
): Promise<void> {
  await assertProject(projectId, client);
  const floor = await client.floor.findFirst({
    where: { id: floorId, block: { projectId } },
    select: { id: true },
  });
  if (!floor) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

  // Yeniden çözümde eski sirkülasyon KALMAZ — bayat poligon bırakmıyoruz.
  await client.commonSpace.deleteMany({ where: { floorId } });
  for (const s of spaces) {
    await client.commonSpace.create({
      data: {
        floorId,
        spaceType: s.spaceType as never,
        geometryComputedValue: s.geometry as unknown as Prisma.InputJsonValue,
        areaComputedValue: round3(s.area),
        perimeterComputedValue: round3(s.perimeter),
      },
    });
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
