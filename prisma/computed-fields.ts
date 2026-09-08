/**
 * HESAPLANAN ALAN KAYIT DEFTERİ — tek doğruluk kaynağı.
 *
 * etut-veri-modeli.md bölüm 1.3 (:36-40) üç adı sabitler:
 *   computedValue · overrideValue · overrideReason
 *
 * Her hesaplanan alan DÖRT kolon alır ve adlandırma MEKANİKTİR:
 *   <alan>ComputedValue   — sistemin hesapladığı
 *   <alan>OverrideValue   — kullanıcının yazdığı (varsa)
 *   <alan>OverrideReason  — neden ezildiği
 *   <alan>                — GENERATED ALWAYS AS (COALESCE(override, computed)) STORED
 *
 * Sonuncusu Postgres tarafından üretilir ve YAZILAMAZ. Dokümanın alan adı
 * böylece birebir korunur ve "COALESCE yapmayı unuttum" yapısal olarak imkânsız
 * hale gelir — ilke 5 disiplinle değil veritabanıyla garanti edilir.
 *
 * Bu dosyadan üretilenler (prisma/codegen/generate.ts):
 *   1. migration SQL — generated kolonlar
 *   2. OverrideLedger view — "bu projedeki tüm ezmeler" tek sorguda
 *   3. src/lib/computed/generated.ts — tipler ve yazma koruması
 *
 * PROVENANCE BURADA TUTULMAZ. Kaynak izlenebilirliği QuantityLine
 * seviyesindedir (sourceObjectType · sourceObjectId · formula).
 */

export type ComputedFieldKind = "decimal" | "int" | "boolean" | "json" | "enum" | "text";

export interface ComputedFieldDef {
  /** Dokümandaki alan adı — BİREBİR. Üç sonek buna eklenir. */
  field: string;
  /** Generated kolonun Postgres tipi. Üçlünün üç kolonu da AYNI tipte olmalı. */
  sqlType: string;
  kind: ComputedFieldKind;
  /** Dokümandaki kaynak satır. */
  src: string;
  /** Türetme dokümanda tanımlı mı? false ise bu bir BOŞLUKTUR, tasarım değil. */
  derivationStated: boolean;
}

export interface ComputedModelDef {
  /** Prisma model adı. */
  model: string;
  /** @@map ile verilen tablo adı. */
  table: string;
  /** OverrideLedger için projectId'ye ulaşan JOIN'ler; bu modelin takma adı `t`. */
  joins: string;
  /** projectId ifadesi. */
  projectIdExpr: string;
  fields: ComputedFieldDef[];
}

const D = (p: number, s: number) => `numeric(${p},${s})`;

export const COMPUTED_MODELS: ComputedModelDef[] = [
  {
    model: "Project",
    table: "project",
    joins: "",
    projectIdExpr: 't."id"',
    fields: [
      // "paketten gelir, ezilebilir" — paket varsayılanı bağlanma anında
      // computedValue'ya materyalize edilir.
      { field: "currency", sqlType: "text", kind: "text", src: ":112", derivationStated: true },
    ],
  },
  {
    model: "ZoningData",
    table: "zoning_data",
    joins: 'JOIN "parcel" pc ON pc."id" = t."parcelId"',
    projectIdExpr: 'pc."projectId"',
    fields: [
      { field: "maxFootprint", sqlType: D(14, 3), kind: "decimal", src: ":158", derivationStated: true },
      { field: "maxTotalFloorArea", sqlType: D(14, 3), kind: "decimal", src: ":158", derivationStated: true },
      { field: "buildableEnvelope", sqlType: "jsonb", kind: "json", src: ":158", derivationStated: true },
      { field: "basementGainFromLevelDifference", sqlType: D(14, 3), kind: "decimal", src: ":158", derivationStated: true },
    ],
  },
  {
    model: "Floor",
    table: "floor",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "grossArea", sqlType: D(14, 3), kind: "decimal", src: ":314", derivationStated: false },
    ],
  },
  {
    model: "Unit",
    table: "unit",
    joins: 'JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "grossArea", sqlType: D(12, 3), kind: "decimal", src: ":294", derivationStated: false },
      { field: "netArea", sqlType: D(12, 3), kind: "decimal", src: ":295", derivationStated: true },
      { field: "balconyArea", sqlType: D(12, 3), kind: "decimal", src: ":296", derivationStated: false },
      { field: "commonAreaShare", sqlType: D(12, 3), kind: "decimal", src: ":297", derivationStated: false },
      { field: "wetAreaTotal", sqlType: D(12, 3), kind: "decimal", src: ":298", derivationStated: true },
    ],
  },
  {
    model: "Space",
    table: "space",
    joins:
      'JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "category", sqlType: '"SpaceCategory"', kind: "enum", src: ":199", derivationStated: true },
      { field: "perimeter", sqlType: D(12, 3), kind: "decimal", src: ":203", derivationStated: true },
      { field: "isWetArea", sqlType: "boolean", kind: "boolean", src: ":205", derivationStated: true },
      { field: "ceilingCorniceLength", sqlType: D(12, 3), kind: "decimal", src: ":211", derivationStated: true },
      { field: "heatingElementSize", sqlType: D(12, 3), kind: "decimal", src: ":214", derivationStated: true },
    ],
  },
  {
    model: "Elevator",
    table: "elevator",
    joins: 'JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "capacityKg", sqlType: "integer", kind: "int", src: ":332", derivationStated: true },
      { field: "stopCount", sqlType: "integer", kind: "int", src: ":334", derivationStated: true },
      { field: "travelHeight", sqlType: D(8, 3), kind: "decimal", src: ":335", derivationStated: false },
    ],
  },
  {
    model: "Stair",
    table: "stair",
    joins: 'JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "totalStepCount", sqlType: "integer", kind: "int", src: ":359", derivationStated: false },
      // SAPMA: doküman :361'de bu alana AD VERMİYOR ("enum + length (H)").
      { field: "railingLength", sqlType: D(10, 3), kind: "decimal", src: ":361", derivationStated: false },
    ],
  },
  {
    model: "ServiceSpace",
    table: "service_space",
    joins: 'JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isMandatory", sqlType: "boolean", kind: "boolean", src: ":383", derivationStated: true },
    ],
  },
  {
    model: "Shelter",
    table: "shelter",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isRequired", sqlType: "boolean", kind: "boolean", src: ":389", derivationStated: true },
      { field: "requiredCapacityPersons", sqlType: "integer", kind: "int", src: ":390", derivationStated: true },
      { field: "totalArea", sqlType: D(12, 3), kind: "decimal", src: ":392", derivationStated: true },
      { field: "gasProofDoorCount", sqlType: "integer", kind: "int", src: ":396", derivationStated: true },
    ],
  },
  {
    model: "ElectricalRoom",
    table: "electrical_room",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      // Dokümanda H işareti YOK ama açıkça türüyor ("talep gücünden").
      { field: "isTransformerRequired", sqlType: "boolean", kind: "boolean", src: ":408", derivationStated: true },
      { field: "demandPowerKW", sqlType: D(12, 3), kind: "decimal", src: ":408", derivationStated: true },
    ],
  },
  {
    model: "WaterTank",
    table: "water_tank",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "domesticWaterVolume", sqlType: D(12, 3), kind: "decimal", src: ":412", derivationStated: true },
      { field: "waterproofingArea", sqlType: D(12, 3), kind: "decimal", src: ":412", derivationStated: false },
    ],
  },
  {
    model: "FireSystem",
    table: "fire_system",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isFirePumpRequired", sqlType: "boolean", kind: "boolean", src: ":416", derivationStated: true },
      { field: "sprinklerRequired", sqlType: "boolean", kind: "boolean", src: ":416", derivationStated: false },
      { field: "detectorCount", sqlType: "integer", kind: "int", src: ":416", derivationStated: true },
    ],
  },
  {
    model: "Generator",
    table: "generator",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "capacityKVA", sqlType: D(12, 2), kind: "decimal", src: ":420", derivationStated: false },
    ],
  },
  {
    model: "HeatingCenter",
    table: "heating_center",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "boilerCapacityKcal", sqlType: D(14, 2), kind: "decimal", src: ":424", derivationStated: true },
      { field: "heatMeterCount", sqlType: "integer", kind: "int", src: ":424", derivationStated: true },
    ],
  },
  {
    model: "ParkingLayout",
    table: "parking_layout",
    joins: "",
    projectIdExpr: 't."projectId"',
    fields: [
      { field: "requiredCount", sqlType: "integer", kind: "int", src: ":438", derivationStated: true },
      { field: "plannedCount", sqlType: "integer", kind: "int", src: ":440", derivationStated: true },
      { field: "deficitCount", sqlType: "integer", kind: "int", src: ":441", derivationStated: true },
      // H/M — hesaplanan AMA kullanıcının doğrudan yazabildiği. Üçlü bunu zaten karşılar.
      { field: "basementFloorCount", sqlType: "integer", kind: "int", src: ":443", derivationStated: true },
      { field: "accessibleSpaceCount", sqlType: "integer", kind: "int", src: ":444", derivationStated: true },
      { field: "bicycleSpaceCount", sqlType: "integer", kind: "int", src: ":446", derivationStated: true },
      { field: "markingLength", sqlType: D(12, 3), kind: "decimal", src: ":448", derivationStated: false },
    ],
  },
  {
    model: "Ramp",
    table: "ramp",
    joins: 'JOIN "parking_layout" pl ON pl."id" = t."parkingLayoutId"',
    projectIdExpr: 'pl."projectId"',
    fields: [
      { field: "length", sqlType: D(10, 3), kind: "decimal", src: ":454", derivationStated: true },
    ],
  },
  {
    model: "Facade",
    table: "facade",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "width", sqlType: D(10, 3), kind: "decimal", src: ":470", derivationStated: true },
      { field: "height", sqlType: D(10, 3), kind: "decimal", src: ":471", derivationStated: false },
      { field: "grossArea", sqlType: D(12, 3), kind: "decimal", src: ":472", derivationStated: false },
      { field: "openingArea", sqlType: D(12, 3), kind: "decimal", src: ":473", derivationStated: true },
      { field: "netArea", sqlType: D(12, 3), kind: "decimal", src: ":474", derivationStated: false },
      { field: "insulationArea", sqlType: D(12, 3), kind: "decimal", src: ":476", derivationStated: true },
    ],
  },
  {
    model: "Roof",
    table: "roof",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "structureWeight", sqlType: D(14, 3), kind: "decimal", src: ":483", derivationStated: false },
      { field: "coveringArea", sqlType: D(12, 3), kind: "decimal", src: ":483", derivationStated: false },
    ],
  },
];

/** Üç sonek — bölüm 1.3'ün kendi sözcükleri, yeniden adlandırılmadı. */
export const SUFFIX = {
  computed: "ComputedValue",
  override: "OverrideValue",
  reason: "OverrideReason",
} as const;

export const computedColumn = (f: string) => `${f}${SUFFIX.computed}`;
export const overrideColumn = (f: string) => `${f}${SUFFIX.override}`;
export const reasonColumn = (f: string) => `${f}${SUFFIX.reason}`;

/** Bir hesaplanan alanın dört kolonu. */
export const quadColumns = (f: string) => [
  computedColumn(f),
  overrideColumn(f),
  reasonColumn(f),
  f,
];

export const allComputedFields = () =>
  COMPUTED_MODELS.flatMap((m) => m.fields.map((f) => ({ ...f, model: m.model, table: m.table })));

export const computedFieldCount = () => allComputedFields().length;
