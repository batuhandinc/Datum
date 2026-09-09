/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
 * Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
 * Yeniden üretmek için: npm run codegen
 *
 * 74 hesaplanan alan, 24 modelde.
 */

/** Her modelin GENERATED (yazılamaz) kolonları. */
export const GENERATED_COLUMNS = {
  Project: [
    "currency",
  ],
  ZoningData: [
    "maxFootprint",
    "maxTotalFloorArea",
    "buildableEnvelope",
    "basementGainFromLevelDifference",
  ],
  Block: [
    "buildingHeight",
  ],
  Floor: [
    "grossArea",
  ],
  Unit: [
    "geometry",
    "grossArea",
    "netArea",
    "balconyArea",
    "commonAreaShare",
    "wetAreaTotal",
  ],
  Space: [
    "category",
    "geometry",
    "perimeter",
    "isWetArea",
    "ceilingCorniceLength",
    "heatingElementSize",
  ],
  Core: [
    "coreStrategy",
    "geometry",
    "area",
    "requiredElevatorCount",
  ],
  Shaft: [
    "offsetX",
    "offsetY",
  ],
  CommonSpace: [
    "geometry",
    "area",
    "perimeter",
  ],
  Wall: [
    "geometry",
    "length",
    "thickness",
  ],
  ColumnGrid: [
    "spacingX",
    "spacingY",
    "columnCount",
  ],
  Elevator: [
    "count",
    "capacityKg",
    "stopCount",
    "travelHeight",
  ],
  Stair: [
    "totalStepCount",
    "railingLength",
  ],
  ServiceSpace: [
    "isMandatory",
    "requiredArea",
  ],
  Shelter: [
    "isRequired",
    "requiredCapacityPersons",
    "totalArea",
    "gasProofDoorCount",
  ],
  ElectricalRoom: [
    "isTransformerRequired",
    "demandPowerKW",
  ],
  WaterTank: [
    "domesticWaterVolume",
    "waterproofingArea",
  ],
  FireSystem: [
    "isFirePumpRequired",
    "sprinklerRequired",
    "detectorCount",
  ],
  Generator: [
    "capacityKVA",
  ],
  HeatingCenter: [
    "boilerCapacityKcal",
    "heatMeterCount",
  ],
  ParkingLayout: [
    "requiredCount",
    "targetCount",
    "plannedCount",
    "deficitCount",
    "basementFloorCount",
    "accessibleSpaceCount",
    "bicycleSpaceCount",
    "markingLength",
  ],
  Ramp: [
    "length",
    "footprintArea",
  ],
  Facade: [
    "width",
    "height",
    "grossArea",
    "openingArea",
    "netArea",
    "insulationArea",
  ],
  Roof: [
    "structureWeight",
    "coveringArea",
  ],
} as const;

export type GeneratedColumns = typeof GENERATED_COLUMNS;
export type ModelWithComputed = keyof GeneratedColumns;

/** Bir modelin yazılamaz kolon adları. */
export type GeneratedColumnOf<M extends ModelWithComputed> =
  GeneratedColumns[M][number];

/**
 * Bir yazma yükünden GENERATED kolonları çıkarır.
 *
 * Postgres bu kolonlara yazmayı zaten REDDEDER; bu tip o hatayı
 * çalışma zamanından DERLEME zamanına taşır.
 *
 *   type UnitCreate = WritablePayload<"Unit", Prisma.UnitUncheckedCreateInput>;
 *   // netArea, grossArea, balconyArea ... artık payload'da YOK
 */
export type WritablePayload<M extends ModelWithComputed, T> = Omit<
  T,
  GeneratedColumnOf<M> & keyof T
>;

/** Çalışma zamanı koruması — repository katmanı bunu kullanır. */
export function stripGeneratedColumns<M extends ModelWithComputed, T extends object>(
  model: M,
  payload: T,
): WritablePayload<M, T> {
  const banned = new Set<string>(GENERATED_COLUMNS[model] as readonly string[]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!banned.has(k)) out[k] = v;
  }
  return out as WritablePayload<M, T>;
}

/** Bir yükün yazılamaz kolon içerip içermediğini söyler (test ve guard için). */
export function findGeneratedColumnViolations(
  model: ModelWithComputed,
  payload: object,
): string[] {
  const banned = new Set<string>(GENERATED_COLUMNS[model] as readonly string[]);
  return Object.keys(payload).filter((k) => banned.has(k));
}
