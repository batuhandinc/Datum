import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { parseLocalPolygon } from "@/lib/geometry/schema";
import { polygon, polygonArea, rectangle, type LocalPolygon } from "@/lib/geometry";
import { shaftAbsolutePosition } from "@/lib/core/l1";
import type { Warning } from "@/lib/warnings";
import { computeL4, verifyParkingCoefficient, type L4Space, type WallType } from "./l4";
import { loadPlanContext } from "./repository";

/**
 * L4 SERVİS KATMANI — okur, çağırır, yazar.
 *
 * DUVAR TÜRETİLİR: iki mekanın paylaştığı sınır duvara dönüşür, tip ilişkiden
 * çıkar. Kullanıcı duvar çizmez; tek doğruluk kaynağı geometri kalır.
 *
 * AYRICA BİR BOŞLUK KAPATILIR. `Space.category` ve `Space.isWetArea` veri
 * modelinde "tipten türer" diye tanımlı ve eşleme `SpaceTypeCategoryMap`
 * paket tablosunda — ama İP-1'den beri HİÇBİR MOTOR onları yazmıyordu.
 * İP-5 metrajı su yalıtımını `isWetArea`'dan çıkaracak; boş kalsaydı
 * sessizce sıfır çıkardı.
 */

const num = (d: { toString(): string } | null): number | null =>
  d === null ? null : Number(d.toString());

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Zarfın en büyük parçası — L1 ve L2 ile AYNI seçim. */
function largestPart(mp: { coordinates: readonly never[] } | null): LocalPolygon | null {
  const parts = (mp?.coordinates ?? []) as unknown as (readonly (readonly [number, number])[])[][];
  if (parts.length === 0) return null;
  let best = parts[0]!;
  let bestArea = -Infinity;
  for (const rings of parts) {
    const area = polygonArea(polygon(rings as never));
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  return polygon(best as never);
}

export interface L4StoreResult {
  readonly walls: number;
  readonly openings: number;
  readonly columns: number | null;
  readonly warnings: readonly Warning[];
  readonly stored: boolean;
}

export async function computeAndStoreL4(
  projectId: string,
  floorId: string,
  client: PrismaClient = prisma,
): Promise<L4StoreResult> {
  const visible = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!visible) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const floor = await client.floor.findFirst({
    where: { id: floorId, block: { projectId } },
    include: {
      units: { include: { spaces: { orderBy: { id: "asc" } } } },
      block: { include: { core: { include: { shafts: true } } } },
    },
  });
  if (!floor) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

  const w: Warning[] = [];
  const reader = await createRuleReader(projectId, client);
  const [elementRules, categoryMap, parkingRule] = await Promise.all([
    reader.buildingElementRules(),
    reader.spaceTypeCategories(),
    reader.parkingRule(),
  ]);
  w.push(...reader.warnings);

  // --- Mekan tipi → kategori / ıslaklık (PAKET eşlemesinden, kodda değil) ---
  const wetByType = new Map(categoryMap.map((m) => [String(m.spaceType), m.isWetArea]));
  const categoryByType = new Map(categoryMap.map((m) => [String(m.spaceType), m.category]));
  for (const unit of floor.units) {
    for (const s of unit.spaces) {
      const wet = wetByType.get(String(s.spaceType));
      const cat = categoryByType.get(String(s.spaceType));
      // Eşleme YOKSA yazılmaz: uydurma bir kategori İP-5'te yanlış kaleme
      // bağlanmak demektir. Paket boşsa alan null kalır.
      if (wet === undefined && cat === undefined) continue;
      await client.space.update({
        where: { id: s.id },
        data: {
          ...(cat === undefined ? {} : { categoryComputedValue: cat }),
          ...(wet === undefined ? {} : { isWetAreaComputedValue: wet }),
        },
      });
    }
  }

  const context = await loadPlanContext(projectId, client);
  const plate = largestPart(context.envelope as never);
  const core = context.core;

  // Şaft ayak izi: konum VE ölçü ikisi de gerekir. Biri eksikse şaft çizilmez.
  const shafts: LocalPolygon[] = [];
  for (const s of floor.block.core?.shafts ?? []) {
    const ox = num(s.offsetX);
    const oy = num(s.offsetY);
    const sw = num(s.width);
    const sd = num(s.depth);
    if (core === null || ox === null || oy === null || sw === null || sd === null) continue;
    const [ax, ay] = shaftAbsolutePosition(core, ox, oy);
    shafts.push(rectangle(ax, ay, sw, sd));
  }

  const spaces: L4Space[] = floor.units.flatMap((u) =>
    u.spaces.map((s) => ({
      spaceId: s.id,
      layoutKey: s.layoutKey,
      spaceType: String(s.spaceType),
      unitId: u.id,
      geometry: parseLocalPolygon(s.geometry),
      isWetArea: wetByType.get(String(s.spaceType)) ?? false,
    })),
  );

  const wallThickness = new Map<WallType, number>();
  const daylightRatio = new Map<string, number>();
  let minDoorWidth: number | null = null;
  let columnSpanX: number | null = null;
  let columnSpanY: number | null = null;
  for (const r of elementRules) {
    if (r.wallType !== null && r.wallThickness !== null) {
      wallThickness.set(r.wallType as WallType, Number(r.wallThickness.toString()));
    }
    if (r.spaceType !== null && r.daylightRatio !== null) {
      daylightRatio.set(String(r.spaceType), Number(r.daylightRatio.toString()));
    }
    if (r.minDoorWidth !== null && minDoorWidth === null) {
      minDoorWidth = Number(r.minDoorWidth.toString());
    }
    if (r.columnSpanX !== null) columnSpanX = Number(r.columnSpanX.toString());
    if (r.columnSpanY !== null) columnSpanY = Number(r.columnSpanY.toString());
  }

  const result = computeL4({
    plate,
    shafts,
    spaces,
    rules: { wallThickness, daylightRatio, minDoorWidth, columnSpanX, columnSpanY },
    clearHeight: floor.clearHeight === null ? null : Number(floor.clearHeight.toString()),
  });
  w.push(...result.warnings);

  // --- Yazma: duvarlar ve açıklıklar YENİDEN üretilir ---
  // Bayat duvar bırakmıyoruz: mekan sınırı değiştiyse eski duvar artık var
  // olmayan bir yerleşimi tarif eder ve İP-5 metrajı onu ölçerdi.
  await client.opening.deleteMany({ where: { space: { unit: { floorId } } } });
  await client.wall.deleteMany({ where: { floorId } });

  const wallIdByKey = new Map<string, string>();
  for (const wall of result.walls) {
    const row = await client.wall.create({
      data: {
        floorId,
        wallKey: wall.wallKey,
        wallType: wall.wallType as never,
        geometryComputedValue: {
          crs: "local-metric",
          type: "LineString",
          coordinates: [wall.geometry[0], wall.geometry[1]],
        } as unknown as Prisma.InputJsonValue,
        lengthComputedValue: round3(wall.length),
        thicknessComputedValue: wall.thickness,
        spaceAId: wall.spaceAId,
        spaceBId: wall.spaceBId,
      },
      select: { id: true },
    });
    wallIdByKey.set(wall.wallKey, row.id);
  }

  for (const o of result.openings) {
    await client.opening.create({
      data: {
        spaceId: o.spaceId,
        openingType: o.openingType as never,
        adjacentSpaceId: o.adjacentSpaceId,
        hostWallId: wallIdByKey.get(o.wallKey) ?? null,
        isExterior: o.isExterior,
        width: round3(o.width),
        height: round3(o.height),
        count: 1,
      },
    });
  }

  // --- Kolon ızgarası ve OTOPARK KATSAYISI DOĞRULAMASI ---
  let columns: number | null = null;
  if (result.columnGrid) {
    columns = result.columnGrid.columnCount;
    const data = {
      spacingXComputedValue: result.columnGrid.spacingX,
      spacingYComputedValue: result.columnGrid.spacingY,
      axes: result.columnGrid.axes as unknown as Prisma.InputJsonValue,
      columnCountComputedValue: result.columnGrid.columnCount,
    };
    await client.columnGrid.upsert({
      where: { blockId: floor.blockId },
      create: { blockId: floor.blockId, ...data },
      update: data,
    });

    // İP-3'ten devreden söz (veri modeli §12.5): geometrik yerleşim otopark
    // katsayısını DEĞİŞTİRMEZ, DOĞRULAR. Otorite katsayıda kalır.
    if (parkingRule) {
      const check = verifyParkingCoefficient(
        result.columnGrid,
        num(parkingRule.areaPerSpace),
        num(parkingRule.spaceWidth),
        num(parkingRule.spaceLength),
      );
      w.push(...check.warnings);
    }
  }

  return {
    walls: result.walls.length,
    openings: result.openings.length,
    columns,
    warnings: w,
    stored: true,
  };
}
