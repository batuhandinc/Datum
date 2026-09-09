/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
 * Kaynak: prisma/schema/*.prisma içindeki /// @tier @own @src açıklamaları
 * Üretici: prisma/codegen/generate.ts · Yeniden üretmek için: npm run codegen
 *
 * SİHİRBAZ ALAN KATALOĞU — "kademeye göre alan gösterimi" (İP-2).
 *
 * Yalnızca KADEMESİ OLAN alanlar buradadır: hesaplanan alanlar ve altyapı
 * alanları (id, FK, zaman damgası) sihirbaz GİRDİSİ değildir.
 *
 * 142 alan, 12 modelde.
 */

export type FieldTier = "K1" | "K2" | "K3";
export type FieldOwnership = "M" | "B" | "H" | "P" | "E";

export interface CatalogEntry {
  readonly tier: FieldTier;
  readonly ownership: readonly FieldOwnership[];
  /** Dokümandaki kaynak BÖLÜM — ör. "etut-veri-modeli.md§3". */
  readonly src: string | null;
}

export const FIELD_CATALOG = {
  Block: {
    name: { tier: "K2", ownership: ["M"], src: null },
    sortOrder: { tier: "K2", ownership: ["M"], src: null },
  },
  Elevator: {
    countComputedValue: { tier: "K1", ownership: ["H"], src: null },
    countOverrideValue: { tier: "K1", ownership: ["H"], src: null },
    countOverrideReason: { tier: "K1", ownership: ["H"], src: null },
    elevatorType: { tier: "K2", ownership: ["M"], src: null },
    capacityPersons: { tier: "K2", ownership: ["M"], src: null },
    speed: { tier: "K3", ownership: ["M"], src: null },
    cabinWidth: { tier: "K2", ownership: ["M"], src: null },
    cabinDepth: { tier: "K2", ownership: ["M"], src: null },
    cabinHeight: { tier: "K2", ownership: ["M"], src: null },
    shaftWidth: { tier: "K2", ownership: ["M"], src: null },
    shaftDepth: { tier: "K2", ownership: ["M"], src: null },
    pitDepth: { tier: "K3", ownership: ["M"], src: null },
    overheadHeight: { tier: "K3", ownership: ["M"], src: null },
    doorType: { tier: "K3", ownership: ["M"], src: null },
    doorWidth: { tier: "K3", ownership: ["M"], src: null },
    machineRoomType: { tier: "K2", ownership: ["M"], src: null },
    driveType: { tier: "K3", ownership: ["M"], src: null },
    cabinFinishLevel: { tier: "K2", ownership: ["P"], src: null },
    hasEmergencyRescue: { tier: "K3", ownership: ["M"], src: null },
    hasBackupPower: { tier: "K3", ownership: ["M"], src: null },
    certificationCost: { tier: "K3", ownership: ["M"], src: null },
  },
  Floor: {
    floorNo: { tier: "K1", ownership: ["M"], src: null },
    floorType: { tier: "K1", ownership: ["M"], src: null },
    isLocked: { tier: "K2", ownership: ["M"], src: null },
    templateFloorId: { tier: "K2", ownership: ["M"], src: null },
    templateFloor: { tier: "K2", ownership: ["M"], src: null },
    derivedFloors: { tier: "K2", ownership: ["M"], src: null },
    grossHeight: { tier: "K1", ownership: ["M"], src: null },
    clearHeight: { tier: "K1", ownership: ["M"], src: null },
    hasCommercial: { tier: "K1", ownership: ["M"], src: null },
  },
  Parcel: {
    province: { tier: "K1", ownership: ["M"], src: null },
    district: { tier: "K1", ownership: ["M"], src: null },
    neighborhood: { tier: "K1", ownership: ["M"], src: null },
    block: { tier: "K1", ownership: ["M"], src: null },
    parcelNo: { tier: "K1", ownership: ["M"], src: null },
    sheetNo: { tier: "K1", ownership: ["M"], src: null },
    area: { tier: "K1", ownership: ["M", "B"], src: null },
    geometry: { tier: "K2", ownership: ["B"], src: null },
    centerLatitude: { tier: "K2", ownership: ["B", "E"], src: null },
    centerLongitude: { tier: "K2", ownership: ["B", "E"], src: null },
    ownershipType: { tier: "K1", ownership: ["M"], src: null },
    ownerCount: { tier: "K1", ownership: ["M"], src: null },
    encumbrances: { tier: "K2", ownership: ["M", "B"], src: null },
    hasExistingBuilding: { tier: "K1", ownership: ["M"], src: null },
    existingBuildingAge: { tier: "K1", ownership: ["M"], src: null },
    existingBuildingFloors: { tier: "K1", ownership: ["M"], src: null },
    existingBuildingUnitCount: { tier: "K1", ownership: ["M"], src: null },
    existingTotalArea: { tier: "K2", ownership: ["M"], src: null },
    demolitionRequired: { tier: "K1", ownership: ["M"], src: null },
    structuralAssessmentStatus: { tier: "K2", ownership: ["M"], src: null },
  },
  Project: {
    name: { tier: "K1", ownership: ["M"], src: null },
    projectType: { tier: "K1", ownership: ["M"], src: null },
    status: { tier: "K1", ownership: ["M"], src: null },
    tier: { tier: "K1", ownership: ["M"], src: null },
    regionPackageVersionId: { tier: "K1", ownership: ["M"], src: null },
    regionPackageVersion: { tier: "K1", ownership: ["M"], src: null },
    currencyComputedValue: { tier: "K1", ownership: ["P"], src: null },
    currencyOverrideValue: { tier: "K1", ownership: ["P"], src: null },
    currencyOverrideReason: { tier: "K1", ownership: ["P"], src: null },
    priceReferenceDate: { tier: "K1", ownership: ["M"], src: null },
  },
  SiteData: {
    topographyLevelDifference: { tier: "K2", ownership: ["M"], src: null },
    excavationHaulDistance: { tier: "K2", ownership: ["M"], src: null },
    disposalSiteFee: { tier: "K2", ownership: ["M"], src: null },
    siteAccessRoadWidth: { tier: "K2", ownership: ["M"], src: null },
    craneFeasible: { tier: "K2", ownership: ["M"], src: null },
    utilityConnections: { tier: "K3", ownership: ["M"], src: null },
    siteFencePerimeter: { tier: "K2", ownership: ["M"], src: null },
    fencedSides: { tier: "K2", ownership: ["M"], src: null },
  },
  SoilData: {
    reportFile: { tier: "K3", ownership: ["B"], src: null },
    soilClass: { tier: "K2", ownership: ["M"], src: null },
    bearingCapacity: { tier: "K3", ownership: ["M"], src: null },
    groundwaterLevel: { tier: "K2", ownership: ["M"], src: null },
    liquefactionRisk: { tier: "K3", ownership: ["M"], src: null },
    foundationType: { tier: "K2", ownership: ["M"], src: null },
    pileRequired: { tier: "K2", ownership: ["M"], src: null },
    pileCount: { tier: "K3", ownership: ["M"], src: null },
    pileDepth: { tier: "K3", ownership: ["M"], src: null },
    pileDiameter: { tier: "K3", ownership: ["M"], src: null },
    shoringRequired: { tier: "K2", ownership: ["M"], src: null },
    shoringMethod: { tier: "K2", ownership: ["M"], src: null },
    shoringArea: { tier: "K2", ownership: ["M"], src: null },
    adjacentBuildingDistances: { tier: "K2", ownership: ["M"], src: null },
  },
  Space: {
    name: { tier: "K2", ownership: ["M"], src: null },
    spaceType: { tier: "K2", ownership: ["M"], src: null },
    area: { tier: "K2", ownership: ["M"], src: null },
    width: { tier: "K2", ownership: ["M"], src: null },
    length: { tier: "K2", ownership: ["M"], src: null },
    clearHeight: { tier: "K2", ownership: ["M"], src: null },
    floorFinishId: { tier: "K2", ownership: ["P"], src: null },
    floorFinish: { tier: "K2", ownership: ["P"], src: null },
    skirtingType: { tier: "K3", ownership: ["M"], src: null },
    skirtingHeight: { tier: "K3", ownership: ["M"], src: null },
    wallFinishId: { tier: "K2", ownership: ["P"], src: null },
    wallFinish: { tier: "K2", ownership: ["P"], src: null },
    wallCladdingHeight: { tier: "K2", ownership: ["M"], src: null },
    ceilingType: { tier: "K2", ownership: ["M"], src: null },
    waterproofing: { tier: "K2", ownership: ["M"], src: null },
    heatingElement: { tier: "K2", ownership: ["M"], src: null },
    hasAirConditioner: { tier: "K2", ownership: ["M"], src: null },
    ventilationType: { tier: "K3", ownership: ["M"], src: null },
    electricalPresetId: { tier: "K2", ownership: ["P"], src: null },
  },
  SpecificationSet: {
    selectedLevel: { tier: "K1", ownership: ["M"], src: null },
  },
  Stakeholder: {
    name: { tier: "K2", ownership: ["M"], src: null },
    contactPhone: { tier: "K2", ownership: ["M"], src: null },
    contactEmail: { tier: "K2", ownership: ["M"], src: null },
    shareRatio: { tier: "K2", ownership: ["M"], src: null },
    existingUnitArea: { tier: "K2", ownership: ["M"], src: null },
    expectationNotes: { tier: "K2", ownership: ["M"], src: null },
    agreementStance: { tier: "K2", ownership: ["M"], src: null },
    housingAidEligible: { tier: "K3", ownership: ["M"], src: null },
    housingAidMonths: { tier: "K3", ownership: ["M"], src: null },
    incentiveProgramEligible: { tier: "K3", ownership: ["M", "P"], src: null },
  },
  Unit: {
    unitNo: { tier: "K2", ownership: ["M"], src: null },
    unitTypeCode: { tier: "K2", ownership: ["M"], src: null },
    usageType: { tier: "K1", ownership: ["M"], src: null },
    isDuplex: { tier: "K2", ownership: ["M"], src: null },
    linkedUnitId: { tier: "K2", ownership: ["M"], src: null },
    linkedUnit: { tier: "K2", ownership: ["M"], src: null },
    linkedFrom: { tier: "K2", ownership: ["M"], src: null },
    landShareRatio: { tier: "K3", ownership: ["M"], src: null },
    assignedStakeholderId: { tier: "K3", ownership: ["M"], src: null },
    assignedStakeholder: { tier: "K3", ownership: ["M"], src: null },
    salePrice: { tier: "K3", ownership: ["M"], src: null },
  },
  ZoningData: {
    documentFile: { tier: "K2", ownership: ["B"], src: null },
    planNotes: { tier: "K2", ownership: ["B", "M"], src: null },
    buildingOrder: { tier: "K1", ownership: ["M"], src: null },
    groundCoverageRatio: { tier: "K1", ownership: ["M"], src: null },
    floorAreaRatio: { tier: "K1", ownership: ["M"], src: null },
    farCalculationBasis: { tier: "K1", ownership: ["P"], src: null },
    setbackFront: { tier: "K1", ownership: ["M"], src: null },
    setbackSide: { tier: "K1", ownership: ["M"], src: null },
    setbackRear: { tier: "K1", ownership: ["M"], src: null },
    maxFloorCount: { tier: "K1", ownership: ["M"], src: null },
    maxHeight: { tier: "K1", ownership: ["M"], src: null },
    heightReferenceRuleKey: { tier: "K2", ownership: ["P"], src: null },
    roadFrontages: { tier: "K2", ownership: ["M"], src: null },
    referenceLevel: { tier: "K2", ownership: ["M"], src: null },
    cornerLevels: { tier: "K3", ownership: ["M", "E"], src: null },
    levelDataSource: { tier: "K2", ownership: ["M"], src: null },
    specialConstraints: { tier: "K2", ownership: ["M"], src: null },
  },
} as const satisfies Record<string, Record<string, CatalogEntry>>;

export type CatalogModel = keyof typeof FIELD_CATALOG;

const TIER_ORDER: Record<FieldTier, number> = { K1: 1, K2: 2, K3: 3 };

/**
 * Bir modelin verilen kademede GÖRÜNEN alanları.
 *
 * Görünürlük KÜMÜLATİFTİR: K2 projesinde K1 ∪ K2 alanları görünür.
 * Kademe yalnızca görünürlüğü kapatır, ASLA zorunluluk üretmez —
 * "kademe yükseltince önceki veriler korunur" (etut-surec-modeli.md§2).
 */
export function fieldsForTier<M extends CatalogModel>(
  model: M,
  tier: FieldTier,
): (keyof (typeof FIELD_CATALOG)[M])[] {
  const entries = FIELD_CATALOG[model] as Record<string, CatalogEntry>;
  return Object.entries(entries)
    .filter(([, e]) => TIER_ORDER[e.tier] <= TIER_ORDER[tier])
    .map(([field]) => field) as (keyof (typeof FIELD_CATALOG)[M])[];
}

/** Alanın kademe bilgisi; katalogda yoksa null (sihirbaz girdisi değil). */
export function catalogEntry(model: string, field: string): CatalogEntry | null {
  const entries = (FIELD_CATALOG as Record<string, Record<string, CatalogEntry>>)[model];
  return entries?.[field] ?? null;
}
