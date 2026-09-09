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
ALTER TABLE "unit" DROP COLUMN IF EXISTS "geometry";
ALTER TABLE "unit" ADD COLUMN "geometry" jsonb
  GENERATED ALWAYS AS (COALESCE("geometryOverrideValue", "geometryComputedValue")) STORED;
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
ALTER TABLE "space" DROP COLUMN IF EXISTS "geometry";
ALTER TABLE "space" ADD COLUMN "geometry" jsonb
  GENERATED ALWAYS AS (COALESCE("geometryOverrideValue", "geometryComputedValue")) STORED;
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

-- Shaft (shaft)
ALTER TABLE "shaft" DROP COLUMN IF EXISTS "offsetX";
ALTER TABLE "shaft" ADD COLUMN "offsetX" numeric(8,3)
  GENERATED ALWAYS AS (COALESCE("offsetXOverrideValue", "offsetXComputedValue")) STORED;
ALTER TABLE "shaft" DROP COLUMN IF EXISTS "offsetY";
ALTER TABLE "shaft" ADD COLUMN "offsetY" numeric(8,3)
  GENERATED ALWAYS AS (COALESCE("offsetYOverrideValue", "offsetYComputedValue")) STORED;

-- CommonSpace (common_space)
ALTER TABLE "common_space" DROP COLUMN IF EXISTS "geometry";
ALTER TABLE "common_space" ADD COLUMN "geometry" jsonb
  GENERATED ALWAYS AS (COALESCE("geometryOverrideValue", "geometryComputedValue")) STORED;
ALTER TABLE "common_space" DROP COLUMN IF EXISTS "area";
ALTER TABLE "common_space" ADD COLUMN "area" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("areaOverrideValue", "areaComputedValue")) STORED;
ALTER TABLE "common_space" DROP COLUMN IF EXISTS "perimeter";
ALTER TABLE "common_space" ADD COLUMN "perimeter" numeric(12,3)
  GENERATED ALWAYS AS (COALESCE("perimeterOverrideValue", "perimeterComputedValue")) STORED;

-- Wall (wall)
ALTER TABLE "wall" DROP COLUMN IF EXISTS "geometry";
ALTER TABLE "wall" ADD COLUMN "geometry" jsonb
  GENERATED ALWAYS AS (COALESCE("geometryOverrideValue", "geometryComputedValue")) STORED;
ALTER TABLE "wall" DROP COLUMN IF EXISTS "length";
ALTER TABLE "wall" ADD COLUMN "length" numeric(10,3)
  GENERATED ALWAYS AS (COALESCE("lengthOverrideValue", "lengthComputedValue")) STORED;
ALTER TABLE "wall" DROP COLUMN IF EXISTS "thickness";
ALTER TABLE "wall" ADD COLUMN "thickness" numeric(6,3)
  GENERATED ALWAYS AS (COALESCE("thicknessOverrideValue", "thicknessComputedValue")) STORED;

-- ColumnGrid (column_grid)
ALTER TABLE "column_grid" DROP COLUMN IF EXISTS "spacingX";
ALTER TABLE "column_grid" ADD COLUMN "spacingX" numeric(6,2)
  GENERATED ALWAYS AS (COALESCE("spacingXOverrideValue", "spacingXComputedValue")) STORED;
ALTER TABLE "column_grid" DROP COLUMN IF EXISTS "spacingY";
ALTER TABLE "column_grid" ADD COLUMN "spacingY" numeric(6,2)
  GENERATED ALWAYS AS (COALESCE("spacingYOverrideValue", "spacingYComputedValue")) STORED;
ALTER TABLE "column_grid" DROP COLUMN IF EXISTS "columnCount";
ALTER TABLE "column_grid" ADD COLUMN "columnCount" integer
  GENERATED ALWAYS AS (COALESCE("columnCountOverrideValue", "columnCountComputedValue")) STORED;

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
