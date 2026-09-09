-- =============================================================================
-- İP-3 şema değişiklikleri — veri modeli sürüm 1.3
--
-- 1. Core alan tablosu: strateji, poligon, alan, gereken asansör adedi.
--    Bölüm 2 hiyerarşide adını geçiriyordu ama "çekirdek yerleşiyor"
--    ölçütünün saklanacağı TEK BİR ALAN tanımlı değildi.
-- 2. Shaft.offsetX/offsetY — ÇEKİRDEĞE GÖRELİ konum. Mutlak saklansaydı
--    çekirdek taşınınca düşey süreklilik sessizce kırılabilirdi.
-- 3. Block.buildingHeight — üç kural eşiğinin girdisi, evi yoktu.
-- 4. ServiceSpace.requiredArea — areaFormula'nın sonucunu yazacak kolon yoktu.
-- 5. ParkingLayout.acceptedDeficitCount — bilinçli eksik kabulü (İP-9 raporu).
-- 6. Ramp.footprintArea — "bodrum alanının ciddi kısmını yer"in sayısal karşılığı.
-- 7. ParkingRule'a araç başına alan katsayıları (otorite BURADADIR).
-- 8. Elevator.count ve ParkingLayout.targetCount ÜÇLÜYE çevrildi: başlangıç
--    sihirbazı "ön-doldurulan ile değiştirilen ayırt edilebilir kalsın" diyor.
--
-- Hesaplanan alan: 52 → 61 · model: 18 → 20 · kolon: 208 → 244.
-- Kural tablosu sayısı DEĞİŞMEDİ (22) → dondurma trigger listesi aynı kalır.
-- =============================================================================

-- CreateEnum
CREATE TYPE "CoreStrategy" AS ENUM ('merkezi', 'kenar', 'cift');

-- ---------------------------------------------------------------- Block
ALTER TABLE "block" ADD COLUMN "buildingHeightComputedValue" DECIMAL(8,2);
ALTER TABLE "block" ADD COLUMN "buildingHeightOverrideValue" DECIMAL(8,2);
ALTER TABLE "block" ADD COLUMN "buildingHeightOverrideReason" TEXT;

-- ---------------------------------------------------------------- Core
ALTER TABLE "core" ADD COLUMN "coreStrategyComputedValue" "CoreStrategy";
ALTER TABLE "core" ADD COLUMN "coreStrategyOverrideValue" "CoreStrategy";
ALTER TABLE "core" ADD COLUMN "coreStrategyOverrideReason" TEXT;
ALTER TABLE "core" ADD COLUMN "geometryComputedValue" JSONB;
ALTER TABLE "core" ADD COLUMN "geometryOverrideValue" JSONB;
ALTER TABLE "core" ADD COLUMN "geometryOverrideReason" TEXT;
ALTER TABLE "core" ADD COLUMN "areaComputedValue" DECIMAL(12,3);
ALTER TABLE "core" ADD COLUMN "areaOverrideValue" DECIMAL(12,3);
ALTER TABLE "core" ADD COLUMN "areaOverrideReason" TEXT;
ALTER TABLE "core" ADD COLUMN "requiredElevatorCountComputedValue" INTEGER;
ALTER TABLE "core" ADD COLUMN "requiredElevatorCountOverrideValue" INTEGER;
ALTER TABLE "core" ADD COLUMN "requiredElevatorCountOverrideReason" TEXT;

-- ---------------------------------------------------------------- Elevator
-- count DÜZ KOLONDAN ÜÇLÜYE. Mevcut değer KAYBEDİLMEZ: hesaplanan kolona
-- taşınır, sonra düz kolon düşürülür ve generated olarak yeniden eklenir
-- (aşağıdaki computed-columns bloğunda).
ALTER TABLE "elevator" ADD COLUMN "countComputedValue" INTEGER;
ALTER TABLE "elevator" ADD COLUMN "countOverrideValue" INTEGER;
ALTER TABLE "elevator" ADD COLUMN "countOverrideReason" TEXT;
UPDATE "elevator" SET "countComputedValue" = "count";

-- ---------------------------------------------------------------- Shaft
-- Çekirdek orijinine GÖRELİ konum. Düşey süreklilik böylece türetilir.
ALTER TABLE "shaft" ADD COLUMN "offsetX" DECIMAL(8,3);
ALTER TABLE "shaft" ADD COLUMN "offsetY" DECIMAL(8,3);

-- ---------------------------------------------------------------- ServiceSpace
ALTER TABLE "service_space" ADD COLUMN "requiredAreaComputedValue" DECIMAL(12,3);
ALTER TABLE "service_space" ADD COLUMN "requiredAreaOverrideValue" DECIMAL(12,3);
ALTER TABLE "service_space" ADD COLUMN "requiredAreaOverrideReason" TEXT;

-- ---------------------------------------------------------------- ParkingLayout
ALTER TABLE "parking_layout" ADD COLUMN "targetCountComputedValue" INTEGER;
ALTER TABLE "parking_layout" ADD COLUMN "targetCountOverrideValue" INTEGER;
ALTER TABLE "parking_layout" ADD COLUMN "targetCountOverrideReason" TEXT;
-- Kullanıcının girdiği hedef bir EZMEDİR; hesaplanan kolona değil ezme kolonuna taşınır.
UPDATE "parking_layout" SET "targetCountOverrideValue" = "targetCount";
ALTER TABLE "parking_layout" ADD COLUMN "acceptedDeficitCount" INTEGER;

-- ---------------------------------------------------------------- Ramp
ALTER TABLE "ramp" ADD COLUMN "footprintAreaComputedValue" DECIMAL(12,3);
ALTER TABLE "ramp" ADD COLUMN "footprintAreaOverrideValue" DECIMAL(12,3);
ALTER TABLE "ramp" ADD COLUMN "footprintAreaOverrideReason" TEXT;

-- ---------------------------------------------------------------- ParkingRule
-- Araç başına alan. spaceWidth × spaceLength park yerinin KENDİ alanıdır,
-- gerçek verim değil; aradaki farkı kolon kayıpları ve dönüş yarıçapları
-- belirler ve türetilen sayı sistematik olarak iyimser çıkar.
-- Nullable: kural yoksa sayım yapılmaz + uyarı (ilke 1).
ALTER TABLE "parking_rule" ADD COLUMN "areaPerSpace" DECIMAL(8,3);
ALTER TABLE "parking_rule" ADD COLUMN "accessibleAreaPerSpace" DECIMAL(8,3);
ALTER TABLE "parking_rule" ADD COLUMN "bicycleAreaPerSpace" DECIMAL(8,3);


-- =============================================================================
-- ÜRETİLMİŞ: prisma/sql/computed-columns.sql (npm run codegen)
-- Generated kolonlar Prisma şemasından türetilemez; buraya kopyalanır.
-- Dosya idempotent (DROP IF EXISTS + ADD), mevcut kolonlar zarar görmez.
-- =============================================================================

-- ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
-- Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
-- Yeniden üretmek için: npm run codegen

-- Hesaplanan alanların DÖRDÜNCÜ kolonu: GENERATED ALWAYS AS ... STORED.
-- Prisma bu kolonu sıradan nullable kolon olarak oluşturur; burada düşürülüp
-- generated olarak yeniden eklenir. Böylece kolon YAZILAMAZ hale gelir ve
-- "COALESCE yapmayı unuttum" hatası yapısal olarak imkânsızlaşır (ilke 5).

-- Project (project)
ALTER TABLE "project" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "project" ADD COLUMN "currency" text
  GENERATED ALWAYS AS (COALESCE("currencyOverrideValue", "currencyComputedValue")) STORED;

-- ZoningData (zoning_data)
ALTER TABLE "zoning_data" DROP COLUMN IF EXISTS "maxFootprint";
ALTER TABLE "zoning_data" ADD COLUMN "maxFootprint" numeric(14,3)
  GENERATED ALWAYS AS (COALESCE("maxFootprintOverrideValue", "maxFootprintComputedValue")) STORED;
ALTER TABLE "zoning_data" DROP COLUMN IF EXISTS "maxTotalFloorArea";
ALTER TABLE "zoning_data" ADD COLUMN "maxTotalFloorArea" numeric(14,3)
  GENERATED ALWAYS AS (COALESCE("maxTotalFloorAreaOverrideValue", "maxTotalFloorAreaComputedValue")) STORED;
ALTER TABLE "zoning_data" DROP COLUMN IF EXISTS "buildableEnvelope";
ALTER TABLE "zoning_data" ADD COLUMN "buildableEnvelope" jsonb
  GENERATED ALWAYS AS (COALESCE("buildableEnvelopeOverrideValue", "buildableEnvelopeComputedValue")) STORED;
ALTER TABLE "zoning_data" DROP COLUMN IF EXISTS "basementGainFromLevelDifference";
ALTER TABLE "zoning_data" ADD COLUMN "basementGainFromLevelDifference" numeric(14,3)
  GENERATED ALWAYS AS (COALESCE("basementGainFromLevelDifferenceOverrideValue", "basementGainFromLevelDifferenceComputedValue")) STORED;

-- Block (block)
ALTER TABLE "block" DROP COLUMN IF EXISTS "buildingHeight";
ALTER TABLE "block" ADD COLUMN "buildingHeight" numeric(8,2)
  GENERATED ALWAYS AS (COALESCE("buildingHeightOverrideValue", "buildingHeightComputedValue")) STORED;

-- Floor (floor)
ALTER TABLE "floor" DROP COLUMN IF EXISTS "grossArea";
ALTER TABLE "floor" ADD COLUMN "grossArea" numeric(14,3)
  GENERATED ALWAYS AS (COALESCE("grossAreaOverrideValue", "grossAreaComputedValue")) STORED;

-- Unit (unit)
ALTER TABLE "unit" DROP COLUMN IF EXISTS "grossArea";
ALTER TABLE "unit" ADD COLUMN "grossArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("grossAreaOverrideValue", "grossAreaComputedValue")) STORED;
ALTER TABLE "unit" DROP COLUMN IF EXISTS "netArea";
ALTER TABLE "unit" ADD COLUMN "netArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("netAreaOverrideValue", "netAreaComputedValue")) STORED;
ALTER TABLE "unit" DROP COLUMN IF EXISTS "balconyArea";
ALTER TABLE "unit" ADD COLUMN "balconyArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("balconyAreaOverrideValue", "balconyAreaComputedValue")) STORED;
ALTER TABLE "unit" DROP COLUMN IF EXISTS "commonAreaShare";
ALTER TABLE "unit" ADD COLUMN "commonAreaShare" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("commonAreaShareOverrideValue", "commonAreaShareComputedValue")) STORED;
ALTER TABLE "unit" DROP COLUMN IF EXISTS "wetAreaTotal";
ALTER TABLE "unit" ADD COLUMN "wetAreaTotal" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("wetAreaTotalOverrideValue", "wetAreaTotalComputedValue")) STORED;

-- Space (space)
ALTER TABLE "space" DROP COLUMN IF EXISTS "category";
ALTER TABLE "space" ADD COLUMN "category" "SpaceCategory"
  GENERATED ALWAYS AS (COALESCE("categoryOverrideValue", "categoryComputedValue")) STORED;
ALTER TABLE "space" DROP COLUMN IF EXISTS "perimeter";
ALTER TABLE "space" ADD COLUMN "perimeter" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("perimeterOverrideValue", "perimeterComputedValue")) STORED;
ALTER TABLE "space" DROP COLUMN IF EXISTS "isWetArea";
ALTER TABLE "space" ADD COLUMN "isWetArea" boolean
  GENERATED ALWAYS AS (COALESCE("isWetAreaOverrideValue", "isWetAreaComputedValue")) STORED;
ALTER TABLE "space" DROP COLUMN IF EXISTS "ceilingCorniceLength";
ALTER TABLE "space" ADD COLUMN "ceilingCorniceLength" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("ceilingCorniceLengthOverrideValue", "ceilingCorniceLengthComputedValue")) STORED;
ALTER TABLE "space" DROP COLUMN IF EXISTS "heatingElementSize";
ALTER TABLE "space" ADD COLUMN "heatingElementSize" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("heatingElementSizeOverrideValue", "heatingElementSizeComputedValue")) STORED;

-- Core (core)
ALTER TABLE "core" DROP COLUMN IF EXISTS "coreStrategy";
ALTER TABLE "core" ADD COLUMN "coreStrategy" "CoreStrategy"
  GENERATED ALWAYS AS (COALESCE("coreStrategyOverrideValue", "coreStrategyComputedValue")) STORED;
ALTER TABLE "core" DROP COLUMN IF EXISTS "geometry";
ALTER TABLE "core" ADD COLUMN "geometry" jsonb
  GENERATED ALWAYS AS (COALESCE("geometryOverrideValue", "geometryComputedValue")) STORED;
ALTER TABLE "core" DROP COLUMN IF EXISTS "area";
ALTER TABLE "core" ADD COLUMN "area" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("areaOverrideValue", "areaComputedValue")) STORED;
ALTER TABLE "core" DROP COLUMN IF EXISTS "requiredElevatorCount";
ALTER TABLE "core" ADD COLUMN "requiredElevatorCount" integer
  GENERATED ALWAYS AS (COALESCE("requiredElevatorCountOverrideValue", "requiredElevatorCountComputedValue")) STORED;

-- Elevator (elevator)
ALTER TABLE "elevator" DROP COLUMN IF EXISTS "count";
ALTER TABLE "elevator" ADD COLUMN "count" integer
  GENERATED ALWAYS AS (COALESCE("countOverrideValue", "countComputedValue")) STORED;
ALTER TABLE "elevator" DROP COLUMN IF EXISTS "capacityKg";
ALTER TABLE "elevator" ADD COLUMN "capacityKg" integer
  GENERATED ALWAYS AS (COALESCE("capacityKgOverrideValue", "capacityKgComputedValue")) STORED;
ALTER TABLE "elevator" DROP COLUMN IF EXISTS "stopCount";
ALTER TABLE "elevator" ADD COLUMN "stopCount" integer
  GENERATED ALWAYS AS (COALESCE("stopCountOverrideValue", "stopCountComputedValue")) STORED;
ALTER TABLE "elevator" DROP COLUMN IF EXISTS "travelHeight";
ALTER TABLE "elevator" ADD COLUMN "travelHeight" numeric(8,3)
  GENERATED ALWAYS AS (COALESCE("travelHeightOverrideValue", "travelHeightComputedValue")) STORED;

-- Stair (stair)
ALTER TABLE "stair" DROP COLUMN IF EXISTS "totalStepCount";
ALTER TABLE "stair" ADD COLUMN "totalStepCount" integer
  GENERATED ALWAYS AS (COALESCE("totalStepCountOverrideValue", "totalStepCountComputedValue")) STORED;
ALTER TABLE "stair" DROP COLUMN IF EXISTS "railingLength";
ALTER TABLE "stair" ADD COLUMN "railingLength" numeric(10,3)
  GENERATED ALWAYS AS (COALESCE("railingLengthOverrideValue", "railingLengthComputedValue")) STORED;

-- ServiceSpace (service_space)
ALTER TABLE "service_space" DROP COLUMN IF EXISTS "isMandatory";
ALTER TABLE "service_space" ADD COLUMN "isMandatory" boolean
  GENERATED ALWAYS AS (COALESCE("isMandatoryOverrideValue", "isMandatoryComputedValue")) STORED;
ALTER TABLE "service_space" DROP COLUMN IF EXISTS "requiredArea";
ALTER TABLE "service_space" ADD COLUMN "requiredArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("requiredAreaOverrideValue", "requiredAreaComputedValue")) STORED;

-- Shelter (shelter)
ALTER TABLE "shelter" DROP COLUMN IF EXISTS "isRequired";
ALTER TABLE "shelter" ADD COLUMN "isRequired" boolean
  GENERATED ALWAYS AS (COALESCE("isRequiredOverrideValue", "isRequiredComputedValue")) STORED;
ALTER TABLE "shelter" DROP COLUMN IF EXISTS "requiredCapacityPersons";
ALTER TABLE "shelter" ADD COLUMN "requiredCapacityPersons" integer
  GENERATED ALWAYS AS (COALESCE("requiredCapacityPersonsOverrideValue", "requiredCapacityPersonsComputedValue")) STORED;
ALTER TABLE "shelter" DROP COLUMN IF EXISTS "totalArea";
ALTER TABLE "shelter" ADD COLUMN "totalArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("totalAreaOverrideValue", "totalAreaComputedValue")) STORED;
ALTER TABLE "shelter" DROP COLUMN IF EXISTS "gasProofDoorCount";
ALTER TABLE "shelter" ADD COLUMN "gasProofDoorCount" integer
  GENERATED ALWAYS AS (COALESCE("gasProofDoorCountOverrideValue", "gasProofDoorCountComputedValue")) STORED;

-- ElectricalRoom (electrical_room)
ALTER TABLE "electrical_room" DROP COLUMN IF EXISTS "isTransformerRequired";
ALTER TABLE "electrical_room" ADD COLUMN "isTransformerRequired" boolean
  GENERATED ALWAYS AS (COALESCE("isTransformerRequiredOverrideValue", "isTransformerRequiredComputedValue")) STORED;
ALTER TABLE "electrical_room" DROP COLUMN IF EXISTS "demandPowerKW";
ALTER TABLE "electrical_room" ADD COLUMN "demandPowerKW" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("demandPowerKWOverrideValue", "demandPowerKWComputedValue")) STORED;

-- WaterTank (water_tank)
ALTER TABLE "water_tank" DROP COLUMN IF EXISTS "domesticWaterVolume";
ALTER TABLE "water_tank" ADD COLUMN "domesticWaterVolume" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("domesticWaterVolumeOverrideValue", "domesticWaterVolumeComputedValue")) STORED;
ALTER TABLE "water_tank" DROP COLUMN IF EXISTS "waterproofingArea";
ALTER TABLE "water_tank" ADD COLUMN "waterproofingArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("waterproofingAreaOverrideValue", "waterproofingAreaComputedValue")) STORED;

-- FireSystem (fire_system)
ALTER TABLE "fire_system" DROP COLUMN IF EXISTS "isFirePumpRequired";
ALTER TABLE "fire_system" ADD COLUMN "isFirePumpRequired" boolean
  GENERATED ALWAYS AS (COALESCE("isFirePumpRequiredOverrideValue", "isFirePumpRequiredComputedValue")) STORED;
ALTER TABLE "fire_system" DROP COLUMN IF EXISTS "sprinklerRequired";
ALTER TABLE "fire_system" ADD COLUMN "sprinklerRequired" boolean
  GENERATED ALWAYS AS (COALESCE("sprinklerRequiredOverrideValue", "sprinklerRequiredComputedValue")) STORED;
ALTER TABLE "fire_system" DROP COLUMN IF EXISTS "detectorCount";
ALTER TABLE "fire_system" ADD COLUMN "detectorCount" integer
  GENERATED ALWAYS AS (COALESCE("detectorCountOverrideValue", "detectorCountComputedValue")) STORED;

-- Generator (generator)
ALTER TABLE "generator" DROP COLUMN IF EXISTS "capacityKVA";
ALTER TABLE "generator" ADD COLUMN "capacityKVA" numeric(12,2)
  GENERATED ALWAYS AS (COALESCE("capacityKVAOverrideValue", "capacityKVAComputedValue")) STORED;

-- HeatingCenter (heating_center)
ALTER TABLE "heating_center" DROP COLUMN IF EXISTS "boilerCapacityKcal";
ALTER TABLE "heating_center" ADD COLUMN "boilerCapacityKcal" numeric(14,2)
  GENERATED ALWAYS AS (COALESCE("boilerCapacityKcalOverrideValue", "boilerCapacityKcalComputedValue")) STORED;
ALTER TABLE "heating_center" DROP COLUMN IF EXISTS "heatMeterCount";
ALTER TABLE "heating_center" ADD COLUMN "heatMeterCount" integer
  GENERATED ALWAYS AS (COALESCE("heatMeterCountOverrideValue", "heatMeterCountComputedValue")) STORED;

-- ParkingLayout (parking_layout)
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "requiredCount";
ALTER TABLE "parking_layout" ADD COLUMN "requiredCount" integer
  GENERATED ALWAYS AS (COALESCE("requiredCountOverrideValue", "requiredCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "targetCount";
ALTER TABLE "parking_layout" ADD COLUMN "targetCount" integer
  GENERATED ALWAYS AS (COALESCE("targetCountOverrideValue", "targetCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "plannedCount";
ALTER TABLE "parking_layout" ADD COLUMN "plannedCount" integer
  GENERATED ALWAYS AS (COALESCE("plannedCountOverrideValue", "plannedCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "deficitCount";
ALTER TABLE "parking_layout" ADD COLUMN "deficitCount" integer
  GENERATED ALWAYS AS (COALESCE("deficitCountOverrideValue", "deficitCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "basementFloorCount";
ALTER TABLE "parking_layout" ADD COLUMN "basementFloorCount" integer
  GENERATED ALWAYS AS (COALESCE("basementFloorCountOverrideValue", "basementFloorCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "accessibleSpaceCount";
ALTER TABLE "parking_layout" ADD COLUMN "accessibleSpaceCount" integer
  GENERATED ALWAYS AS (COALESCE("accessibleSpaceCountOverrideValue", "accessibleSpaceCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "bicycleSpaceCount";
ALTER TABLE "parking_layout" ADD COLUMN "bicycleSpaceCount" integer
  GENERATED ALWAYS AS (COALESCE("bicycleSpaceCountOverrideValue", "bicycleSpaceCountComputedValue")) STORED;
ALTER TABLE "parking_layout" DROP COLUMN IF EXISTS "markingLength";
ALTER TABLE "parking_layout" ADD COLUMN "markingLength" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("markingLengthOverrideValue", "markingLengthComputedValue")) STORED;

-- Ramp (ramp)
ALTER TABLE "ramp" DROP COLUMN IF EXISTS "length";
ALTER TABLE "ramp" ADD COLUMN "length" numeric(10,3)
  GENERATED ALWAYS AS (COALESCE("lengthOverrideValue", "lengthComputedValue")) STORED;
ALTER TABLE "ramp" DROP COLUMN IF EXISTS "footprintArea";
ALTER TABLE "ramp" ADD COLUMN "footprintArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("footprintAreaOverrideValue", "footprintAreaComputedValue")) STORED;

-- Facade (facade)
ALTER TABLE "facade" DROP COLUMN IF EXISTS "width";
ALTER TABLE "facade" ADD COLUMN "width" numeric(10,3)
  GENERATED ALWAYS AS (COALESCE("widthOverrideValue", "widthComputedValue")) STORED;
ALTER TABLE "facade" DROP COLUMN IF EXISTS "height";
ALTER TABLE "facade" ADD COLUMN "height" numeric(10,3)
  GENERATED ALWAYS AS (COALESCE("heightOverrideValue", "heightComputedValue")) STORED;
ALTER TABLE "facade" DROP COLUMN IF EXISTS "grossArea";
ALTER TABLE "facade" ADD COLUMN "grossArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("grossAreaOverrideValue", "grossAreaComputedValue")) STORED;
ALTER TABLE "facade" DROP COLUMN IF EXISTS "openingArea";
ALTER TABLE "facade" ADD COLUMN "openingArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("openingAreaOverrideValue", "openingAreaComputedValue")) STORED;
ALTER TABLE "facade" DROP COLUMN IF EXISTS "netArea";
ALTER TABLE "facade" ADD COLUMN "netArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("netAreaOverrideValue", "netAreaComputedValue")) STORED;
ALTER TABLE "facade" DROP COLUMN IF EXISTS "insulationArea";
ALTER TABLE "facade" ADD COLUMN "insulationArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("insulationAreaOverrideValue", "insulationAreaComputedValue")) STORED;

-- Roof (roof)
ALTER TABLE "roof" DROP COLUMN IF EXISTS "structureWeight";
ALTER TABLE "roof" ADD COLUMN "structureWeight" numeric(14,3)
  GENERATED ALWAYS AS (COALESCE("structureWeightOverrideValue", "structureWeightComputedValue")) STORED;
ALTER TABLE "roof" DROP COLUMN IF EXISTS "coveringArea";
ALTER TABLE "roof" ADD COLUMN "coveringArea" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("coveringAreaOverrideValue", "coveringAreaComputedValue")) STORED;

-- =============================================================================
-- ÜRETİLMİŞ: prisma/sql/override-ledger.sql (npm run codegen)
-- =============================================================================

-- ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
-- Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
-- Yeniden üretmek için: npm run codegen

-- Ezilmiş DEĞERLERİN tümü, tek sorguda:
--   SELECT * FROM "OverrideLedger" WHERE "projectId" = $1;
--
-- İlke 5 (ezme işaretlenir) ve ilke 10 (rapor denetlenebilir) bu view ile karşılanır.
-- 61 hesaplanan alan · 61 dal.
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
    'Block'::text            AS "entityType",
    t."id"                        AS "entityId",
    t."projectId"            AS "projectId",
    'buildingHeight'::text            AS "fieldKey",
    to_jsonb(t."buildingHeightComputedValue")            AS "computedValue",
    to_jsonb(t."buildingHeightOverrideValue")            AS "overrideValue",
    t."buildingHeightOverrideReason"                      AS "overrideReason"
  FROM "block" t
  WHERE t."buildingHeightOverrideValue" IS NOT NULL
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
    'Core'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'coreStrategy'::text            AS "fieldKey",
    to_jsonb(t."coreStrategyComputedValue")            AS "computedValue",
    to_jsonb(t."coreStrategyOverrideValue")            AS "overrideValue",
    t."coreStrategyOverrideReason"                      AS "overrideReason"
  FROM "core" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."coreStrategyOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Core'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'geometry'::text            AS "fieldKey",
    to_jsonb(t."geometryComputedValue")            AS "computedValue",
    to_jsonb(t."geometryOverrideValue")            AS "overrideValue",
    t."geometryOverrideReason"                      AS "overrideReason"
  FROM "core" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."geometryOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Core'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'area'::text            AS "fieldKey",
    to_jsonb(t."areaComputedValue")            AS "computedValue",
    to_jsonb(t."areaOverrideValue")            AS "overrideValue",
    t."areaOverrideReason"                      AS "overrideReason"
  FROM "core" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."areaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Core'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'requiredElevatorCount'::text            AS "fieldKey",
    to_jsonb(t."requiredElevatorCountComputedValue")            AS "computedValue",
    to_jsonb(t."requiredElevatorCountOverrideValue")            AS "overrideValue",
    t."requiredElevatorCountOverrideReason"                      AS "overrideReason"
  FROM "core" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."requiredElevatorCountOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Elevator'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'count'::text            AS "fieldKey",
    to_jsonb(t."countComputedValue")            AS "computedValue",
    to_jsonb(t."countOverrideValue")            AS "overrideValue",
    t."countOverrideReason"                      AS "overrideReason"
  FROM "elevator" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."countOverrideValue" IS NOT NULL
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
    'ServiceSpace'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'requiredArea'::text            AS "fieldKey",
    to_jsonb(t."requiredAreaComputedValue")            AS "computedValue",
    to_jsonb(t."requiredAreaOverrideValue")            AS "overrideValue",
    t."requiredAreaOverrideReason"                      AS "overrideReason"
  FROM "service_space" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."requiredAreaOverrideValue" IS NOT NULL
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
    'targetCount'::text            AS "fieldKey",
    to_jsonb(t."targetCountComputedValue")            AS "computedValue",
    to_jsonb(t."targetCountOverrideValue")            AS "overrideValue",
    t."targetCountOverrideReason"                      AS "overrideReason"
  FROM "parking_layout" t
  WHERE t."targetCountOverrideValue" IS NOT NULL
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
    'Ramp'::text            AS "entityType",
    t."id"                        AS "entityId",
    pl."projectId"            AS "projectId",
    'footprintArea'::text            AS "fieldKey",
    to_jsonb(t."footprintAreaComputedValue")            AS "computedValue",
    to_jsonb(t."footprintAreaOverrideValue")            AS "overrideValue",
    t."footprintAreaOverrideReason"                      AS "overrideReason"
  FROM "ramp" t
  JOIN "parking_layout" pl ON pl."id" = t."parkingLayoutId"
  WHERE t."footprintAreaOverrideValue" IS NOT NULL
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
