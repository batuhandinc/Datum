-- ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
-- Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
-- Yeniden üretmek için: npm run codegen

-- Ezilmiş DEĞERLERİN tümü, tek sorguda:
--   SELECT * FROM "OverrideLedger" WHERE "projectId" = $1;
--
-- İlke 5 (ezme işaretlenir) ve ilke 10 (rapor denetlenebilir) bu view ile karşılanır.
-- 52 hesaplanan alan · 52 dal.
-- Yalnızca overrideValue DOLU satırlar listelenir.

DROP VIEW IF EXISTS "OverrideLedger";
CREATE VIEW "OverrideLedger" AS
  SELECT
    'Project'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."id"            AS "projectId",
    'currency'::text            AS "fieldKey",
    to_jsonb(t."currencyComputedValue")            AS "computedValue",
    to_jsonb(t."currencyOverrideValue")            AS "overrideValue",
    t."currencyOverrideReason"                      AS "overrideReason"
  FROM "project" t
  WHERE t."currencyOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ZoningData'::text            AS "entityType",
    t."id"                        AS "entityId",
    pc."projectId"            AS "projectId",
    'maxFootprint'::text            AS "fieldKey",
    to_jsonb(t."maxFootprintComputedValue")            AS "computedValue",
    to_jsonb(t."maxFootprintOverrideValue")            AS "overrideValue",
    t."maxFootprintOverrideReason"                      AS "overrideReason"
  FROM "zoning_data" t
  JOIN "parcel" pc ON pc."id" = t."parcelId"
  WHERE t."maxFootprintOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ZoningData'::text            AS "entityType",
    t."id"                        AS "entityId",
    pc."projectId"            AS "projectId",
    'maxTotalFloorArea'::text            AS "fieldKey",
    to_jsonb(t."maxTotalFloorAreaComputedValue")            AS "computedValue",
    to_jsonb(t."maxTotalFloorAreaOverrideValue")            AS "overrideValue",
    t."maxTotalFloorAreaOverrideReason"                      AS "overrideReason"
  FROM "zoning_data" t
  JOIN "parcel" pc ON pc."id" = t."parcelId"
  WHERE t."maxTotalFloorAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ZoningData'::text            AS "entityType",
    t."id"                        AS "entityId",
    pc."projectId"            AS "projectId",
    'buildableEnvelope'::text            AS "fieldKey",
    to_jsonb(t."buildableEnvelopeComputedValue")            AS "computedValue",
    to_jsonb(t."buildableEnvelopeOverrideValue")            AS "overrideValue",
    t."buildableEnvelopeOverrideReason"                      AS "overrideReason"
  FROM "zoning_data" t
  JOIN "parcel" pc ON pc."id" = t."parcelId"
  WHERE t."buildableEnvelopeOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ZoningData'::text            AS "entityType",
    t."id"                        AS "entityId",
    pc."projectId"            AS "projectId",
    'basementGainFromLevelDifference'::text            AS "fieldKey",
    to_jsonb(t."basementGainFromLevelDifferenceComputedValue")            AS "computedValue",
    to_jsonb(t."basementGainFromLevelDifferenceOverrideValue")            AS "overrideValue",
    t."basementGainFromLevelDifferenceOverrideReason"                      AS "overrideReason"
  FROM "zoning_data" t
  JOIN "parcel" pc ON pc."id" = t."parcelId"
  WHERE t."basementGainFromLevelDifferenceOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Floor'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'grossArea'::text            AS "fieldKey",
    to_jsonb(t."grossAreaComputedValue")            AS "computedValue",
    to_jsonb(t."grossAreaOverrideValue")            AS "overrideValue",
    t."grossAreaOverrideReason"                      AS "overrideReason"
  FROM "floor" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."grossAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Unit'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'grossArea'::text            AS "fieldKey",
    to_jsonb(t."grossAreaComputedValue")            AS "computedValue",
    to_jsonb(t."grossAreaOverrideValue")            AS "overrideValue",
    t."grossAreaOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."grossAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Unit'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'netArea'::text            AS "fieldKey",
    to_jsonb(t."netAreaComputedValue")            AS "computedValue",
    to_jsonb(t."netAreaOverrideValue")            AS "overrideValue",
    t."netAreaOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."netAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Unit'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'balconyArea'::text            AS "fieldKey",
    to_jsonb(t."balconyAreaComputedValue")            AS "computedValue",
    to_jsonb(t."balconyAreaOverrideValue")            AS "overrideValue",
    t."balconyAreaOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."balconyAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Unit'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'commonAreaShare'::text            AS "fieldKey",
    to_jsonb(t."commonAreaShareComputedValue")            AS "computedValue",
    to_jsonb(t."commonAreaShareOverrideValue")            AS "overrideValue",
    t."commonAreaShareOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."commonAreaShareOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Unit'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'wetAreaTotal'::text            AS "fieldKey",
    to_jsonb(t."wetAreaTotalComputedValue")            AS "computedValue",
    to_jsonb(t."wetAreaTotalOverrideValue")            AS "overrideValue",
    t."wetAreaTotalOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."wetAreaTotalOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Space'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'category'::text            AS "fieldKey",
    to_jsonb(t."categoryComputedValue")            AS "computedValue",
    to_jsonb(t."categoryOverrideValue")            AS "overrideValue",
    t."categoryOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."categoryOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Space'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'perimeter'::text            AS "fieldKey",
    to_jsonb(t."perimeterComputedValue")            AS "computedValue",
    to_jsonb(t."perimeterOverrideValue")            AS "overrideValue",
    t."perimeterOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."perimeterOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Space'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'isWetArea'::text            AS "fieldKey",
    to_jsonb(t."isWetAreaComputedValue")            AS "computedValue",
    to_jsonb(t."isWetAreaOverrideValue")            AS "overrideValue",
    t."isWetAreaOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."isWetAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Space'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'ceilingCorniceLength'::text            AS "fieldKey",
    to_jsonb(t."ceilingCorniceLengthComputedValue")            AS "computedValue",
    to_jsonb(t."ceilingCorniceLengthOverrideValue")            AS "overrideValue",
    t."ceilingCorniceLengthOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."ceilingCorniceLengthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Space'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'heatingElementSize'::text            AS "fieldKey",
    to_jsonb(t."heatingElementSizeComputedValue")            AS "computedValue",
    to_jsonb(t."heatingElementSizeOverrideValue")            AS "overrideValue",
    t."heatingElementSizeOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."heatingElementSizeOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Elevator'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'capacityKg'::text            AS "fieldKey",
    to_jsonb(t."capacityKgComputedValue")            AS "computedValue",
    to_jsonb(t."capacityKgOverrideValue")            AS "overrideValue",
    t."capacityKgOverrideReason"                      AS "overrideReason"
  FROM "elevator" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."capacityKgOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Elevator'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'stopCount'::text            AS "fieldKey",
    to_jsonb(t."stopCountComputedValue")            AS "computedValue",
    to_jsonb(t."stopCountOverrideValue")            AS "overrideValue",
    t."stopCountOverrideReason"                      AS "overrideReason"
  FROM "elevator" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."stopCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Elevator'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'travelHeight'::text            AS "fieldKey",
    to_jsonb(t."travelHeightComputedValue")            AS "computedValue",
    to_jsonb(t."travelHeightOverrideValue")            AS "overrideValue",
    t."travelHeightOverrideReason"                      AS "overrideReason"
  FROM "elevator" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."travelHeightOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Stair'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'totalStepCount'::text            AS "fieldKey",
    to_jsonb(t."totalStepCountComputedValue")            AS "computedValue",
    to_jsonb(t."totalStepCountOverrideValue")            AS "overrideValue",
    t."totalStepCountOverrideReason"                      AS "overrideReason"
  FROM "stair" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."totalStepCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Stair'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'railingLength'::text            AS "fieldKey",
    to_jsonb(t."railingLengthComputedValue")            AS "computedValue",
    to_jsonb(t."railingLengthOverrideValue")            AS "overrideValue",
    t."railingLengthOverrideReason"                      AS "overrideReason"
  FROM "stair" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."railingLengthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ServiceSpace'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'isMandatory'::text            AS "fieldKey",
    to_jsonb(t."isMandatoryComputedValue")            AS "computedValue",
    to_jsonb(t."isMandatoryOverrideValue")            AS "overrideValue",
    t."isMandatoryOverrideReason"                      AS "overrideReason"
  FROM "service_space" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."isMandatoryOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Shelter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'isRequired'::text            AS "fieldKey",
    to_jsonb(t."isRequiredComputedValue")            AS "computedValue",
    to_jsonb(t."isRequiredOverrideValue")            AS "overrideValue",
    t."isRequiredOverrideReason"                      AS "overrideReason"
  FROM "shelter" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."isRequiredOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Shelter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'requiredCapacityPersons'::text            AS "fieldKey",
    to_jsonb(t."requiredCapacityPersonsComputedValue")            AS "computedValue",
    to_jsonb(t."requiredCapacityPersonsOverrideValue")            AS "overrideValue",
    t."requiredCapacityPersonsOverrideReason"                      AS "overrideReason"
  FROM "shelter" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."requiredCapacityPersonsOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Shelter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'totalArea'::text            AS "fieldKey",
    to_jsonb(t."totalAreaComputedValue")            AS "computedValue",
    to_jsonb(t."totalAreaOverrideValue")            AS "overrideValue",
    t."totalAreaOverrideReason"                      AS "overrideReason"
  FROM "shelter" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."totalAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Shelter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'gasProofDoorCount'::text            AS "fieldKey",
    to_jsonb(t."gasProofDoorCountComputedValue")            AS "computedValue",
    to_jsonb(t."gasProofDoorCountOverrideValue")            AS "overrideValue",
    t."gasProofDoorCountOverrideReason"                      AS "overrideReason"
  FROM "shelter" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."gasProofDoorCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ElectricalRoom'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'isTransformerRequired'::text            AS "fieldKey",
    to_jsonb(t."isTransformerRequiredComputedValue")            AS "computedValue",
    to_jsonb(t."isTransformerRequiredOverrideValue")            AS "overrideValue",
    t."isTransformerRequiredOverrideReason"                      AS "overrideReason"
  FROM "electrical_room" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."isTransformerRequiredOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ElectricalRoom'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'demandPowerKW'::text            AS "fieldKey",
    to_jsonb(t."demandPowerKWComputedValue")            AS "computedValue",
    to_jsonb(t."demandPowerKWOverrideValue")            AS "overrideValue",
    t."demandPowerKWOverrideReason"                      AS "overrideReason"
  FROM "electrical_room" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."demandPowerKWOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'WaterTank'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'domesticWaterVolume'::text            AS "fieldKey",
    to_jsonb(t."domesticWaterVolumeComputedValue")            AS "computedValue",
    to_jsonb(t."domesticWaterVolumeOverrideValue")            AS "overrideValue",
    t."domesticWaterVolumeOverrideReason"                      AS "overrideReason"
  FROM "water_tank" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."domesticWaterVolumeOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'WaterTank'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'waterproofingArea'::text            AS "fieldKey",
    to_jsonb(t."waterproofingAreaComputedValue")            AS "computedValue",
    to_jsonb(t."waterproofingAreaOverrideValue")            AS "overrideValue",
    t."waterproofingAreaOverrideReason"                      AS "overrideReason"
  FROM "water_tank" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."waterproofingAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'FireSystem'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'isFirePumpRequired'::text            AS "fieldKey",
    to_jsonb(t."isFirePumpRequiredComputedValue")            AS "computedValue",
    to_jsonb(t."isFirePumpRequiredOverrideValue")            AS "overrideValue",
    t."isFirePumpRequiredOverrideReason"                      AS "overrideReason"
  FROM "fire_system" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."isFirePumpRequiredOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'FireSystem'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'sprinklerRequired'::text            AS "fieldKey",
    to_jsonb(t."sprinklerRequiredComputedValue")            AS "computedValue",
    to_jsonb(t."sprinklerRequiredOverrideValue")            AS "overrideValue",
    t."sprinklerRequiredOverrideReason"                      AS "overrideReason"
  FROM "fire_system" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."sprinklerRequiredOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'FireSystem'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'detectorCount'::text            AS "fieldKey",
    to_jsonb(t."detectorCountComputedValue")            AS "computedValue",
    to_jsonb(t."detectorCountOverrideValue")            AS "overrideValue",
    t."detectorCountOverrideReason"                      AS "overrideReason"
  FROM "fire_system" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."detectorCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Generator'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'capacityKVA'::text            AS "fieldKey",
    to_jsonb(t."capacityKVAComputedValue")            AS "computedValue",
    to_jsonb(t."capacityKVAOverrideValue")            AS "overrideValue",
    t."capacityKVAOverrideReason"                      AS "overrideReason"
  FROM "generator" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."capacityKVAOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'HeatingCenter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'boilerCapacityKcal'::text            AS "fieldKey",
    to_jsonb(t."boilerCapacityKcalComputedValue")            AS "computedValue",
    to_jsonb(t."boilerCapacityKcalOverrideValue")            AS "overrideValue",
    t."boilerCapacityKcalOverrideReason"                      AS "overrideReason"
  FROM "heating_center" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."boilerCapacityKcalOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'HeatingCenter'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'heatMeterCount'::text            AS "fieldKey",
    to_jsonb(t."heatMeterCountComputedValue")            AS "computedValue",
    to_jsonb(t."heatMeterCountOverrideValue")            AS "overrideValue",
    t."heatMeterCountOverrideReason"                      AS "overrideReason"
  FROM "heating_center" t
  JOIN "service_space" ss ON ss."id" = t."serviceSpaceId" JOIN "floor" f ON f."id" = ss."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."heatMeterCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'requiredCount'::text            AS "fieldKey",
    to_jsonb(t."requiredCountComputedValue")            AS "computedValue",
    to_jsonb(t."requiredCountOverrideValue")            AS "overrideValue",
    t."requiredCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."requiredCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'plannedCount'::text            AS "fieldKey",
    to_jsonb(t."plannedCountComputedValue")            AS "computedValue",
    to_jsonb(t."plannedCountOverrideValue")            AS "overrideValue",
    t."plannedCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."plannedCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'deficitCount'::text            AS "fieldKey",
    to_jsonb(t."deficitCountComputedValue")            AS "computedValue",
    to_jsonb(t."deficitCountOverrideValue")            AS "overrideValue",
    t."deficitCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."deficitCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'basementFloorCount'::text            AS "fieldKey",
    to_jsonb(t."basementFloorCountComputedValue")            AS "computedValue",
    to_jsonb(t."basementFloorCountOverrideValue")            AS "overrideValue",
    t."basementFloorCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."basementFloorCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'accessibleSpaceCount'::text            AS "fieldKey",
    to_jsonb(t."accessibleSpaceCountComputedValue")            AS "computedValue",
    to_jsonb(t."accessibleSpaceCountOverrideValue")            AS "overrideValue",
    t."accessibleSpaceCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."accessibleSpaceCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'bicycleSpaceCount'::text            AS "fieldKey",
    to_jsonb(t."bicycleSpaceCountComputedValue")            AS "computedValue",
    to_jsonb(t."bicycleSpaceCountOverrideValue")            AS "overrideValue",
    t."bicycleSpaceCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."bicycleSpaceCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ParkingLayout'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'markingLength'::text            AS "fieldKey",
    to_jsonb(t."markingLengthComputedValue")            AS "computedValue",
    to_jsonb(t."markingLengthOverrideValue")            AS "overrideValue",
    t."markingLengthOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."markingLengthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Ramp'::text            AS "entityType",
    t."id"                        AS "entityId",
    pl."projectId"            AS "projectId",
    'length'::text            AS "fieldKey",
    to_jsonb(t."lengthComputedValue")            AS "computedValue",
    to_jsonb(t."lengthOverrideValue")            AS "overrideValue",
    t."lengthOverrideReason"                      AS "overrideReason"
  FROM "ramp" t
  JOIN "parking_layout" pl ON pl."id" = t."parkingLayoutId"
  WHERE t."lengthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'width'::text            AS "fieldKey",
    to_jsonb(t."widthComputedValue")            AS "computedValue",
    to_jsonb(t."widthOverrideValue")            AS "overrideValue",
    t."widthOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."widthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'height'::text            AS "fieldKey",
    to_jsonb(t."heightComputedValue")            AS "computedValue",
    to_jsonb(t."heightOverrideValue")            AS "overrideValue",
    t."heightOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."heightOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'grossArea'::text            AS "fieldKey",
    to_jsonb(t."grossAreaComputedValue")            AS "computedValue",
    to_jsonb(t."grossAreaOverrideValue")            AS "overrideValue",
    t."grossAreaOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."grossAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'openingArea'::text            AS "fieldKey",
    to_jsonb(t."openingAreaComputedValue")            AS "computedValue",
    to_jsonb(t."openingAreaOverrideValue")            AS "overrideValue",
    t."openingAreaOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."openingAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'netArea'::text            AS "fieldKey",
    to_jsonb(t."netAreaComputedValue")            AS "computedValue",
    to_jsonb(t."netAreaOverrideValue")            AS "overrideValue",
    t."netAreaOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."netAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Facade'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'insulationArea'::text            AS "fieldKey",
    to_jsonb(t."insulationAreaComputedValue")            AS "computedValue",
    to_jsonb(t."insulationAreaOverrideValue")            AS "overrideValue",
    t."insulationAreaOverrideReason"                      AS "overrideReason"
  FROM "facade" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."insulationAreaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Roof'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'structureWeight'::text            AS "fieldKey",
    to_jsonb(t."structureWeightComputedValue")            AS "computedValue",
    to_jsonb(t."structureWeightOverrideValue")            AS "overrideValue",
    t."structureWeightOverrideReason"                      AS "overrideReason"
  FROM "roof" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."structureWeightOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Roof'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'coveringArea'::text            AS "fieldKey",
    to_jsonb(t."coveringAreaComputedValue")            AS "computedValue",
    to_jsonb(t."coveringAreaOverrideValue")            AS "overrideValue",
    t."coveringAreaOverrideReason"                      AS "overrideReason"
  FROM "roof" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."coveringAreaOverrideValue" IS NOT NULL
;
