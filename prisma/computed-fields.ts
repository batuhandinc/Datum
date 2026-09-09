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
  /**
   * Dokümandaki kaynak BÖLÜM — satır değil.
   *
   * Satır numarası kırılgandır: dokümana bir paragraf eklemek tüm referansları
   * birden bozar. v1.1, v1.2 ve v1.3'te tam olarak bu oldu. Şema dosyalarındaki
   * `@src` v1.2'de bölüm çapasına geçmişti; burası atlanmıştı.
   */
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
      { field: "currency", sqlType: "text", kind: "text", src: "etut-veri-modeli.md§3", derivationStated: true },
    ],
  },
  {
    model: "ZoningData",
    table: "zoning_data",
    joins: 'JOIN "parcel" pc ON pc."id" = t."parcelId"',
    projectIdExpr: 'pc."projectId"',
    fields: [
      { field: "maxFootprint", sqlType: D(14, 3), kind: "decimal", src: "etut-veri-modeli.md§3", derivationStated: true },
      { field: "maxTotalFloorArea", sqlType: D(14, 3), kind: "decimal", src: "etut-veri-modeli.md§3", derivationStated: true },
      { field: "buildableEnvelope", sqlType: "jsonb", kind: "json", src: "etut-veri-modeli.md§3", derivationStated: true },
      { field: "basementGainFromLevelDifference", sqlType: D(14, 3), kind: "decimal", src: "etut-veri-modeli.md§3", derivationStated: true },
    ],
  },
  {
    model: "Block",
    table: "block",
    joins: "",
    projectIdExpr: 't."projectId"',
    fields: [
      // Σ Floor.grossHeight. Üç kural eşiğinin (asansör, yangın asansörü,
      // yangın pompası) girdisi; sürüm 1.3'e kadar şemada evi yoktu.
      { field: "buildingHeight", sqlType: D(8, 2), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: true },
    ],
  },
  {
    model: "Floor",
    table: "floor",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "grossArea", sqlType: D(14, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: false },
    ],
  },
  {
    model: "Unit",
    table: "unit",
    joins: 'JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "grossArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: false },
      { field: "netArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: true },
      { field: "balconyArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: false },
      { field: "commonAreaShare", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: false },
      { field: "wetAreaTotal", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§5", derivationStated: true },
    ],
  },
  {
    model: "Space",
    table: "space",
    joins:
      'JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "category", sqlType: '"SpaceCategory"', kind: "enum", src: "etut-veri-modeli.md§4", derivationStated: true },
      { field: "perimeter", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§4", derivationStated: true },
      { field: "isWetArea", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§4", derivationStated: true },
      { field: "ceilingCorniceLength", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§4", derivationStated: true },
      { field: "heatingElementSize", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§4", derivationStated: true },
    ],
  },
  {
    model: "Core",
    table: "core",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      // L1 ÖNERİR, kullanıcı ezer. Enum kolonun üçü de aynı tipte olmalı.
      { field: "coreStrategy", sqlType: '"CoreStrategy"', kind: "enum", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "geometry", sqlType: "jsonb", kind: "json", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "area", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "requiredElevatorCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§6", derivationStated: true },
    ],
  },
  {
    model: "Elevator",
    table: "elevator",
    joins: 'JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      // Sihirbazın 5. sorusu: CoreRule.minElevatorCount ön-doldurur, kullanıcı ezer.
      { field: "count", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "capacityKg", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "stopCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§6", derivationStated: true },
      { field: "travelHeight", sqlType: D(8, 3), kind: "decimal", src: "etut-veri-modeli.md§6", derivationStated: false },
    ],
  },
  {
    model: "Stair",
    table: "stair",
    joins: 'JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "totalStepCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§6", derivationStated: false },
      // SAPMA: doküman :361'de bu alana AD VERMİYOR ("enum + length (H)").
      { field: "railingLength", sqlType: D(10, 3), kind: "decimal", src: "etut-veri-modeli.md§6", derivationStated: false },
    ],
  },
  {
    model: "ServiceSpace",
    table: "service_space",
    joins: 'JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isMandatory", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§7", derivationStated: true },
      // RequiredSpaceRule.areaFormula'nın sonucu. Formül tanımlıydı, sonucu
      // yazacak kolon yoktu (sürüm 1.3).
      { field: "requiredArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: true },
    ],
  },
  {
    model: "Shelter",
    table: "shelter",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isRequired", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "requiredCapacityPersons", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "totalArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "gasProofDoorCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§7", derivationStated: true },
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
      { field: "isTransformerRequired", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "demandPowerKW", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: true },
    ],
  },
  {
    model: "WaterTank",
    table: "water_tank",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "domesticWaterVolume", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "waterproofingArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: false },
    ],
  },
  {
    model: "FireSystem",
    table: "fire_system",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "isFirePumpRequired", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "sprinklerRequired", sqlType: "boolean", kind: "boolean", src: "etut-veri-modeli.md§7", derivationStated: false },
      { field: "detectorCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§7", derivationStated: true },
    ],
  },
  {
    model: "Generator",
    table: "generator",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "capacityKVA", sqlType: D(12, 2), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: false },
    ],
  },
  {
    model: "HeatingCenter",
    table: "heating_center",
    joins:
      'JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "boilerCapacityKcal", sqlType: D(14, 2), kind: "decimal", src: "etut-veri-modeli.md§7", derivationStated: true },
      { field: "heatMeterCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§7", derivationStated: true },
    ],
  },
  {
    model: "ParkingLayout",
    table: "parking_layout",
    joins: "",
    projectIdExpr: 't."projectId"',
    fields: [
      { field: "requiredCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      // Sihirbazın 1. sorusu: yönetmelik minimumu ön-doldurur, kullanıcı hedefini yazar.
      { field: "targetCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      { field: "plannedCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      { field: "deficitCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      // H/M — hesaplanan AMA kullanıcının doğrudan yazabildiği. Üçlü bunu zaten karşılar.
      { field: "basementFloorCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      { field: "accessibleSpaceCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      { field: "bicycleSpaceCount", sqlType: "integer", kind: "int", src: "etut-veri-modeli.md§8", derivationStated: true },
      { field: "markingLength", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§8", derivationStated: false },
    ],
  },
  {
    model: "Ramp",
    table: "ramp",
    joins: 'JOIN "parking_layout" pl ON pl."id" = t."parkingLayoutId"',
    projectIdExpr: 'pl."projectId"',
    fields: [
      { field: "length", sqlType: D(10, 3), kind: "decimal", src: "etut-veri-modeli.md§8", derivationStated: true },
      // length × width. Otopark havuzundan düşülür (sürüm 1.3).
      { field: "footprintArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§8", derivationStated: true },
    ],
  },
  {
    model: "Facade",
    table: "facade",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "width", sqlType: D(10, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: true },
      { field: "height", sqlType: D(10, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: false },
      { field: "grossArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: false },
      { field: "openingArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: true },
      { field: "netArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: false },
      { field: "insulationArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: true },
    ],
  },
  {
    model: "Roof",
    table: "roof",
    joins: 'JOIN "block" b ON b."id" = t."blockId"',
    projectIdExpr: 'b."projectId"',
    fields: [
      { field: "structureWeight", sqlType: D(14, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: false },
      { field: "coveringArea", sqlType: D(12, 3), kind: "decimal", src: "etut-veri-modeli.md§9", derivationStated: false },
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
