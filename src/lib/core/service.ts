import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { parseLocalMultiPolygon } from "@/lib/geometry/schema";
import { computeL1, proposeShaftOffsets, type CoreRuleInput, type L1Input, type L1Output } from "./l1";

/**
 * L1 SERVİS KATMANI — çekirdek hesabını veriye bağlar.
 *
 * L0 servisinin (`envelope/service.ts`) birebir aynı deseni: hesap saf kalır,
 * bu dosya OKUR, ÇAĞIRIR, YAZAR.
 *
 * YAZMA KURALI: sonuçlar DAİMA `*ComputedValue` kolonlarına gider.
 * `Core.coreStrategy`, `geometry`, `area`, `requiredElevatorCount` GENERATED
 * kolonlardır ve yazılamaz; kullanıcının taşıması `*OverrideValue`'ya yazılır.
 */

const num = (d: Prisma.Decimal | null | undefined): number | null =>
  d === null || d === undefined ? null : Number(d);

export interface L1ComputeResult extends L1Output {
  readonly projectId: string;
  readonly blockId: string | null;
  /** Sonuç veritabanına yazıldı mı? Blok veya çekirdek satırı yoksa yazılmaz. */
  readonly stored: boolean;
}

/**
 * Projenin çekirdeğini hesaplar ve saklar.
 *
 * Şu an TEK BLOK varsayılıyor: `Core` `Block` başına tekildir ve İP-3'ün
 * kapsamında çok bloklu yerleşim yok. Birden çok blok varsa varsayılan
 * (`isDefault`) blok, o da yoksa ilk blok işlenir.
 */
export async function computeAndStoreL1(
  projectId: string,
  client: PrismaClient = prisma,
): Promise<L1ComputeResult> {
  const scoped = scopedPrisma(client, currentOrganizationId());

  // Kiracı filtresi KÖKTEN uygulanır.
  const project = await scoped.project.findUnique({
    where: { id: projectId },
    include: {
      parcel: { include: { zoningData: true } },
      blocks: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: {
          core: { include: { elevators: true } },
          floors: { select: { grossHeight: true, floorType: true, units: { select: { id: true } } } },
        },
      },
    },
  });

  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const block = project.blocks[0] ?? null;
  const zoning = project.parcel?.zoningData ?? null;

  const reader = await createRuleReader(projectId, client);
  const rule = await reader.coreRule();

  // Bina yüksekliği: kat brüt yüksekliklerinin toplamı. Bodrum SAYILMAZ —
  // yükseklik eşikleri (asansör, yangın) zemin üstünü ölçer.
  const aboveGround = (block?.floors ?? []).filter((f) => f.floorType !== "bodrum");
  const buildingHeight = aboveGround.reduce((sum, f) => sum + (num(f.grossHeight) ?? 0), 0);

  // Tipik kattaki birim sayısı: normal katların ortalaması yerine EN KALABALIK
  // kat alınır — çekirdek en yoğun kata göre boyutlanmalı.
  const unitCountPerFloor = Math.max(
    0,
    ...(block?.floors ?? []).map((f) => f.units.length),
  );

  const input: L1Input = {
    buildableEnvelope: parseLocalMultiPolygon(zoning?.buildableEnvelope ?? null),
    floorCount: aboveGround.length > 0 ? aboveGround.length : (zoning?.maxFloorCount ?? null),
    buildingHeight: buildingHeight > 0 ? buildingHeight : null,
    unitCountPerFloor: unitCountPerFloor > 0 ? unitCountPerFloor : null,
    coreRule: rule
      ? ({
          elevatorRequiredFloorThreshold: rule.elevatorRequiredFloorThreshold,
          elevatorRequiredHeightThreshold: num(rule.elevatorRequiredHeightThreshold),
          minElevatorCount: rule.minElevatorCount,
          stretcherElevatorRequired: rule.stretcherElevatorRequired,
          minStretcherCabinWidth: num(rule.minStretcherCabinWidth),
          minStretcherCabinDepth: num(rule.minStretcherCabinDepth),
          minStairWidth: num(rule.minStairWidth),
          minCirculationWidth: num(rule.minCirculationWidth),
          maxEscapeDistance: num(rule.maxEscapeDistance),
        } satisfies CoreRuleInput)
      : null,
    elevators: (block?.core?.elevators ?? []).map((e) => ({
      shaftWidth: num(e.shaftWidth),
      shaftDepth: num(e.shaftDepth),
    })),
    // Kullanıcının seçtiği strateji öneriyi geçersiz kılar (ilke 5).
    strategyOverride: block?.core?.coreStrategyOverrideValue ?? null,
  };

  const result = computeL1(input);
  const warnings = [...reader.warnings, ...result.warnings];

  if (!block?.core) {
    // Blok veya çekirdek satırı henüz yok: hesap yine döner, yazacak yer yok.
    return { ...result, warnings, projectId, blockId: block?.id ?? null, stored: false };
  }

  await client.core.update({
    where: { id: block.core.id },
    data: {
      coreStrategyComputedValue: result.coreStrategy,
      geometryComputedValue:
        result.geometry === null
          ? Prisma.DbNull
          : (result.geometry as unknown as Prisma.InputJsonValue),
      areaComputedValue: result.area,
      requiredElevatorCountComputedValue: result.requiredElevatorCount,
    },
  });

  // ŞAFT KONUMU ÖNERİSİ. Kullanıcının K3'te girdiği değer `OverrideValue`'da
  // durur ve COALESCE onu seçmeye devam eder — öneri kullanıcının işini
  // EZMEZ, yalnızca boş kalan yeri doldurur.
  if (result.geometry !== null) {
    const shafts = await client.shaft.findMany({
      where: { coreId: block.core.id },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    const offsets = proposeShaftOffsets(result.geometry, shafts.length);
    for (let i = 0; i < shafts.length; i += 1) {
      await client.shaft.update({
        where: { id: shafts[i]!.id },
        data: {
          offsetXComputedValue: round3(offsets[i]![0]),
          offsetYComputedValue: round3(offsets[i]![1]),
        },
      });
    }
  }

  // Bina yüksekliği bloğun hesaplanan alanıdır; çekirdek eşiklerinin girdisi.
  await client.block.update({
    where: { id: block.id },
    data: { buildingHeightComputedValue: buildingHeight > 0 ? buildingHeight : null },
  });

  return { ...result, warnings, projectId, blockId: block.id, stored: true };
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
