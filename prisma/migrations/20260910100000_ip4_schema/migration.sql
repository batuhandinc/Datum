-- =============================================================================
-- İP-4 — PLAN MOTORU ŞEMASI (etut-veri-modeli.md sürüm 1.4)
--
-- Hesaplanan alan: 61 → 74 · model: 20 → 24 · kolon: 244 → 296.
-- Kural tablosu: 22 → 24 → DONDURMA TRİGGER LİSTESİ DEĞİŞTİ, bu migration'ın
-- sonuna immutability.sql'in tamamı kopyalanmıştır (CLAUDE.md §5 ritüeli).
--
-- Değişiklikler:
--   1. WallType enum
--   2. unit_layout_rule + building_element_rule  (yeni kural tabloları)
--   3. unit_type_template                        (organizasyon tipoloji kütüphanesi, KÖK)
--   4. wall + column_grid                        (L4'ün varlıkları)
--   5. unit.geometry                             (L2'nin çıktısı)
--   6. space.geometry düz Json → dörtlü          (RENAME ile, veri korunarak)
--   7. space.layoutKey                           (şablon yaprağının kararlı anahtarı)
--   8. shaft.offsetX/offsetY düz → dörtlü        (veri OverrideValue'ya taşınır)
--   9. common_space alanları                     (sirkülasyonun semantik evi)
--  10. opening.hostWallId, unit.linkedUnitId, unit_type kopyalama izleri
-- =============================================================================

-- --------------------------------------------------------------------------
-- 1. Duvar tipi. Enum meşru (bölüm 15.1): kod her tipi ayrı ayrı UYGULAR —
--    kalınlığı farklı paket alanından okur, şaft duvarında pencere olmaz,
--    metraj kalemi farklıdır.
-- --------------------------------------------------------------------------
CREATE TYPE "WallType" AS ENUM ('dis', 'ic', 'islakHacim', 'saft', 'birimAyirici');

-- --------------------------------------------------------------------------
-- 2. Plan motorunun kural tabloları (bölüm 12.6)
-- --------------------------------------------------------------------------
CREATE TABLE "unit_layout_rule" (
  "id"                     TEXT NOT NULL,
  "regionPackageVersionId" TEXT NOT NULL,
  "ruleKey"                TEXT NOT NULL,
  "rowHash"                TEXT,
  "grossToNetFactor"       DECIMAL(6,4),
  "areaTolerance"          DECIMAL(6,4),
  "minUnitFacadeLength"    DECIMAL(6,2),
  "maxUnitAspectRatio"     DECIMAL(6,3),
  CONSTRAINT "unit_layout_rule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_layout_rule_regionPackageVersionId_ruleKey_key"
  ON "unit_layout_rule"("regionPackageVersionId", "ruleKey");

ALTER TABLE "unit_layout_rule"
  ADD CONSTRAINT "unit_layout_rule_regionPackageVersionId_fkey"
  FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "building_element_rule" (
  "id"                     TEXT NOT NULL,
  "regionPackageVersionId" TEXT NOT NULL,
  "ruleKey"                TEXT NOT NULL,
  "rowHash"                TEXT,
  "spaceType"              "SpaceType",
  "minArea"                DECIMAL(8,3),
  "minClearWidth"          DECIMAL(6,2),
  "daylightRatio"          DECIMAL(6,4),
  "wallType"               "WallType",
  "wallThickness"          DECIMAL(6,3),
  "minDoorWidth"           DECIMAL(6,2),
  "columnSpanX"            DECIMAL(6,2),
  "columnSpanY"            DECIMAL(6,2),
  CONSTRAINT "building_element_rule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "building_element_rule_regionPackageVersionId_ruleKey_key"
  ON "building_element_rule"("regionPackageVersionId", "ruleKey");
CREATE INDEX "building_element_rule_regionPackageVersionId_spaceType_idx"
  ON "building_element_rule"("regionPackageVersionId", "spaceType");

ALTER TABLE "building_element_rule"
  ADD CONSTRAINT "building_element_rule_regionPackageVersionId_fkey"
  FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 3. Tipoloji kütüphanesi — KÖK VARLIK (organizationId taşır).
--    Bölge paketinde DEĞİL: şablon mevzuat değil firma alışkanlığıdır.
-- --------------------------------------------------------------------------
CREATE TABLE "unit_type_template" (
  "id"                 TEXT NOT NULL,
  "organizationId"     TEXT NOT NULL,
  "templateCode"       TEXT NOT NULL,
  "version"            TEXT NOT NULL,
  "layoutRecipe"       JSONB,
  "relationAssertions" JSONB,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,
  CONSTRAINT "unit_type_template_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unit_type_template_organizationId_templateCode_version_key"
  ON "unit_type_template"("organizationId", "templateCode", "version");
CREATE INDEX "unit_type_template_organizationId_idx"
  ON "unit_type_template"("organizationId");

ALTER TABLE "unit_type_template"
  ADD CONSTRAINT "unit_type_template_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 4. L4'ün varlıkları: duvar ve kolon aks ızgarası.
--    Duvar TÜRETİLİR, çizilmez — ebeveyni Floor'dur çünkü bir duvar İKİ BİRİMİ
--    ayırabilir. netArea/volume SAKLANMAZ: açıklık düşümü kalem bazındadır.
-- --------------------------------------------------------------------------
CREATE TABLE "wall" (
  "id"                      TEXT NOT NULL,
  "floorId"                 TEXT NOT NULL,
  "wallKey"                 TEXT NOT NULL,
  "wallType"                "WallType",
  "geometryComputedValue"   JSONB,
  "geometryOverrideValue"   JSONB,
  "geometryOverrideReason"  TEXT,
  "lengthComputedValue"     DECIMAL(10,3),
  "lengthOverrideValue"     DECIMAL(10,3),
  "lengthOverrideReason"    TEXT,
  "thicknessComputedValue"  DECIMAL(6,3),
  "thicknessOverrideValue"  DECIMAL(6,3),
  "thicknessOverrideReason" TEXT,
  "spaceAId"                TEXT,
  "spaceBId"                TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wall_floorId_wallKey_key" ON "wall"("floorId", "wallKey");
CREATE INDEX "wall_floorId_idx" ON "wall"("floorId");

ALTER TABLE "wall" ADD CONSTRAINT "wall_floorId_fkey"
  FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wall" ADD CONSTRAINT "wall_spaceAId_fkey"
  FOREIGN KEY ("spaceAId") REFERENCES "space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wall" ADD CONSTRAINT "wall_spaceBId_fkey"
  FOREIGN KEY ("spaceBId") REFERENCES "space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "column_grid" (
  "id"                        TEXT NOT NULL,
  "blockId"                   TEXT NOT NULL,
  "spacingXComputedValue"     DECIMAL(6,2),
  "spacingXOverrideValue"     DECIMAL(6,2),
  "spacingXOverrideReason"    TEXT,
  "spacingYComputedValue"     DECIMAL(6,2),
  "spacingYOverrideValue"     DECIMAL(6,2),
  "spacingYOverrideReason"    TEXT,
  "axes"                      JSONB,
  "columnCountComputedValue"  INTEGER,
  "columnCountOverrideValue"  INTEGER,
  "columnCountOverrideReason" TEXT,
  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "column_grid_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "column_grid_blockId_key" ON "column_grid"("blockId");

ALTER TABLE "column_grid" ADD CONSTRAINT "column_grid_blockId_fkey"
  FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 5. unit — L2'nin çıktısı ve dubleks bağı.
--    Otomatik bölümleme ComputedValue'ya, MANUEL çizim OverrideValue'ya yazar.
-- --------------------------------------------------------------------------
ALTER TABLE "unit" ADD COLUMN "geometryComputedValue"  JSONB;
ALTER TABLE "unit" ADD COLUMN "geometryOverrideValue"  JSONB;
ALTER TABLE "unit" ADD COLUMN "geometryOverrideReason" TEXT;
ALTER TABLE "unit" ADD COLUMN "linkedUnitId"           TEXT;

CREATE UNIQUE INDEX "unit_linkedUnitId_key" ON "unit"("linkedUnitId");
ALTER TABLE "unit" ADD CONSTRAINT "unit_linkedUnitId_fkey"
  FOREIGN KEY ("linkedUnitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- --------------------------------------------------------------------------
-- 6+7. space — geometry düz Json'dan dörtlüye, layoutKey.
--
--   VERİ KORUNUR: mevcut `geometry` kolonu ÖNCE yeniden adlandırılır, sonra
--   computed-columns.sql aynı adla GENERATED bir kolon ekler. Doğrudan
--   ADD COLUMN denenirse "column already exists" ile patlardı.
--
--   Kolon `@own H` işaretliydi (sistem üretir) → veri ComputedValue'ya gider.
-- --------------------------------------------------------------------------
ALTER TABLE "space" RENAME COLUMN "geometry" TO "geometryComputedValue";
ALTER TABLE "space" ADD COLUMN "geometryOverrideValue"  JSONB;
ALTER TABLE "space" ADD COLUMN "geometryOverrideReason" TEXT;
ALTER TABLE "space" ADD COLUMN "layoutKey"              TEXT;

CREATE UNIQUE INDEX "space_unitId_layoutKey_key" ON "space"("unitId", "layoutKey");

-- --------------------------------------------------------------------------
-- 8. shaft — offsetX/offsetY düz kolondan dörtlüye.
--
--   1.3'te bunlar K3 MANUEL alanlardı ve hiçbir motor yazmıyordu. Mevcut veri
--   KULLANICININ girdiğidir, yani bir EZMEDİR → OverrideValue'ya taşınır
--   (parking_layout.targetCount'ta verilen kararın aynısı). L1 bundan sonra
--   ComputedValue'ya öneri yazar.
-- --------------------------------------------------------------------------
ALTER TABLE "shaft" RENAME COLUMN "offsetX" TO "offsetXOverrideValue";
ALTER TABLE "shaft" RENAME COLUMN "offsetY" TO "offsetYOverrideValue";
ALTER TABLE "shaft" ADD COLUMN "offsetXComputedValue"  DECIMAL(8,3);
ALTER TABLE "shaft" ADD COLUMN "offsetXOverrideReason" TEXT;
ALTER TABLE "shaft" ADD COLUMN "offsetYComputedValue"  DECIMAL(8,3);
ALTER TABLE "shaft" ADD COLUMN "offsetYOverrideReason" TEXT;

-- --------------------------------------------------------------------------
-- 9. common_space — sirkülasyonun semantik evi (stub dolduruldu)
-- --------------------------------------------------------------------------
ALTER TABLE "common_space" ADD COLUMN "spaceType"               "SpaceType";
ALTER TABLE "common_space" ADD COLUMN "geometryComputedValue"   JSONB;
ALTER TABLE "common_space" ADD COLUMN "geometryOverrideValue"   JSONB;
ALTER TABLE "common_space" ADD COLUMN "geometryOverrideReason"  TEXT;
ALTER TABLE "common_space" ADD COLUMN "areaComputedValue"       DECIMAL(12,3);
ALTER TABLE "common_space" ADD COLUMN "areaOverrideValue"       DECIMAL(12,3);
ALTER TABLE "common_space" ADD COLUMN "areaOverrideReason"      TEXT;
ALTER TABLE "common_space" ADD COLUMN "perimeterComputedValue"  DECIMAL(12,3);
ALTER TABLE "common_space" ADD COLUMN "perimeterOverrideValue"  DECIMAL(12,3);
ALTER TABLE "common_space" ADD COLUMN "perimeterOverrideReason" TEXT;

-- --------------------------------------------------------------------------
-- 10. opening.hostWallId · unit_type kopyalama izleri
--     hostWallId bir KİMLİKTİR; kenar indeksi kombinatorik bir tutamaç olurdu
--     ve poligon yeniden çizilince açıklık sessizce başka duvara taşınırdı.
-- --------------------------------------------------------------------------
ALTER TABLE "opening" ADD COLUMN "hostWallId" TEXT;
ALTER TABLE "opening" ADD CONSTRAINT "opening_hostWallId_fkey"
  FOREIGN KEY ("hostWallId") REFERENCES "wall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "unit_type" ADD COLUMN "sourceTemplateId"      TEXT;
ALTER TABLE "unit_type" ADD COLUMN "sourceTemplateVersion" TEXT;
ALTER TABLE "unit_type" ADD COLUMN "layoutRecipe"          JSONB;
ALTER TABLE "unit_type" ADD COLUMN "relationAssertions"    JSONB;

ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_sourceTemplateId_fkey"
  FOREIGN KEY ("sourceTemplateId") REFERENCES "unit_type_template"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

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
-- 74 hesaplanan alan · 74 dal.
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
    'geometry'::text            AS "fieldKey",
    to_jsonb(t."geometryComputedValue")            AS "computedValue",
    to_jsonb(t."geometryOverrideValue")            AS "overrideValue",
    t."geometryOverrideReason"                      AS "overrideReason"
  FROM "unit" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."geometryOverrideValue" IS NOT NULL
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
    'geometry'::text            AS "fieldKey",
    to_jsonb(t."geometryComputedValue")            AS "computedValue",
    to_jsonb(t."geometryOverrideValue")            AS "overrideValue",
    t."geometryOverrideReason"                      AS "overrideReason"
  FROM "space" t
  JOIN "unit" u ON u."id" = t."unitId" JOIN "floor" f ON f."id" = u."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."geometryOverrideValue" IS NOT NULL
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
    'Shaft'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'offsetX'::text            AS "fieldKey",
    to_jsonb(t."offsetXComputedValue")            AS "computedValue",
    to_jsonb(t."offsetXOverrideValue")            AS "overrideValue",
    t."offsetXOverrideReason"                      AS "overrideReason"
  FROM "shaft" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."offsetXOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Shaft'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'offsetY'::text            AS "fieldKey",
    to_jsonb(t."offsetYComputedValue")            AS "computedValue",
    to_jsonb(t."offsetYOverrideValue")            AS "overrideValue",
    t."offsetYOverrideReason"                      AS "overrideReason"
  FROM "shaft" t
  JOIN "core" c ON c."id" = t."coreId" JOIN "block" b ON b."id" = c."blockId"
  WHERE t."offsetYOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'CommonSpace'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'geometry'::text            AS "fieldKey",
    to_jsonb(t."geometryComputedValue")            AS "computedValue",
    to_jsonb(t."geometryOverrideValue")            AS "overrideValue",
    t."geometryOverrideReason"                      AS "overrideReason"
  FROM "common_space" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."geometryOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'CommonSpace'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'area'::text            AS "fieldKey",
    to_jsonb(t."areaComputedValue")            AS "computedValue",
    to_jsonb(t."areaOverrideValue")            AS "overrideValue",
    t."areaOverrideReason"                      AS "overrideReason"
  FROM "common_space" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."areaOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'CommonSpace'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'perimeter'::text            AS "fieldKey",
    to_jsonb(t."perimeterComputedValue")            AS "computedValue",
    to_jsonb(t."perimeterOverrideValue")            AS "overrideValue",
    t."perimeterOverrideReason"                      AS "overrideReason"
  FROM "common_space" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."perimeterOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Wall'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'geometry'::text            AS "fieldKey",
    to_jsonb(t."geometryComputedValue")            AS "computedValue",
    to_jsonb(t."geometryOverrideValue")            AS "overrideValue",
    t."geometryOverrideReason"                      AS "overrideReason"
  FROM "wall" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."geometryOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Wall'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'length'::text            AS "fieldKey",
    to_jsonb(t."lengthComputedValue")            AS "computedValue",
    to_jsonb(t."lengthOverrideValue")            AS "overrideValue",
    t."lengthOverrideReason"                      AS "overrideReason"
  FROM "wall" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."lengthOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'Wall'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'thickness'::text            AS "fieldKey",
    to_jsonb(t."thicknessComputedValue")            AS "computedValue",
    to_jsonb(t."thicknessOverrideValue")            AS "overrideValue",
    t."thicknessOverrideReason"                      AS "overrideReason"
  FROM "wall" t
  JOIN "floor" f ON f."id" = t."floorId" JOIN "block" b ON b."id" = f."blockId"
  WHERE t."thicknessOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ColumnGrid'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'spacingX'::text            AS "fieldKey",
    to_jsonb(t."spacingXComputedValue")            AS "computedValue",
    to_jsonb(t."spacingXOverrideValue")            AS "overrideValue",
    t."spacingXOverrideReason"                      AS "overrideReason"
  FROM "column_grid" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."spacingXOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ColumnGrid'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'spacingY'::text            AS "fieldKey",
    to_jsonb(t."spacingYComputedValue")            AS "computedValue",
    to_jsonb(t."spacingYOverrideValue")            AS "overrideValue",
    t."spacingYOverrideReason"                      AS "overrideReason"
  FROM "column_grid" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."spacingYOverrideValue" IS NOT NULL
  UNION ALL
  SELECT
    'ColumnGrid'::text            AS "entityType",
    t."id"                        AS "entityId",
    b."projectId"            AS "projectId",
    'columnCount'::text            AS "fieldKey",
    to_jsonb(t."columnCountComputedValue")            AS "computedValue",
    to_jsonb(t."columnCountOverrideValue")            AS "overrideValue",
    t."columnCountOverrideReason"                      AS "overrideReason"
  FROM "column_grid" t
  JOIN "block" b ON b."id" = t."blockId"
  WHERE t."columnCountOverrideValue" IS NOT NULL
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

-- =============================================================================
-- KOPYA: prisma/sql/immutability.sql
-- KURAL TABLOSU SAYISI 22 -> 24 OLDUĞU İÇİN ZORUNLU (CLAUDE.md §5 ritüeli):
-- migration geçmişi temsil eder ve en sonuncusu GÜNCEL dondurma listesini
-- taşımalıdır. Yeni iki tablo (unit_layout_rule, building_element_rule) aksi
-- halde dondurulmamış kalır ve ilke 2 SESSİZCE delinir.
-- =============================================================================

-- =============================================================================
-- İLKE 2'NİN ZORLANMASI — "Proje bağlandığı bölge paketi sürümünü dondurur.
-- Yönetmelik değişince eski projelerin hesabı geriye dönük değişmemeli."
-- (etut-veri-modeli.md :26-28)
--
-- Bu koruma UYGULAMA KATMANINDA DEĞİL, VERİTABANINDADIR. Prisma client
-- extension'ı anlaşılır hata mesajı verir; asıl koruma buradaki trigger'lardır.
-- $executeRaw, psql oturumu veya başka bir servis de aynı duvara çarpar.
--
-- BİLİNEN SINIR: superuser `ALTER TABLE ... DISABLE TRIGGER` ile bunları
-- devre dışı bırakabilir. Değişmezlik trigger'ın çalıştığı yerde zorlanır,
-- kriptografik olarak değil. rowHash yeniden doğrulaması kurcalamayı
-- SONRADAN tespit eder; önlemez.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Yayımlanmış sürümün kural satırları değişmezdir
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION datum_reject_frozen_rule_mutation() RETURNS trigger AS $$
DECLARE
  old_status text;
  new_status text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT status::text INTO old_status
      FROM "region_package_version"
     WHERE id = OLD."regionPackageVersionId";

    IF old_status IN ('published', 'deprecated') THEN
      RAISE EXCEPTION
        'DATUM_FROZEN: "%" tablosunda değişiklik reddedildi. Bağlı bölge paketi sürümü "%" durumunda ve DEĞİŞMEZDİR (ilke 2). Değişiklik için yeni bir sürüm açın.',
        TG_TABLE_NAME, old_status;
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT status::text INTO new_status
      FROM "region_package_version"
     WHERE id = NEW."regionPackageVersionId";

    IF new_status IN ('published', 'deprecated') THEN
      RAISE EXCEPTION
        'DATUM_FROZEN: "%" tablosuna satır eklenemez/taşınamaz. Hedef bölge paketi sürümü "%" durumunda ve DEĞİŞMEZDİR (ilke 2).',
        TG_TABLE_NAME, new_status;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sürüme bağlı TÜM kural tabloları. Yeni bir kural tablosu eklenirse
-- BU LİSTEYE DE eklenmelidir — testler listeyi şemayla karşılaştırır.
DO $$
DECLARE
  t text;
  frozen_tables text[] := ARRAY[
    'zoning_rule_set',
    'required_space_rule',
    'parking_rule',
    'core_rule',
    'fire_safety_rule',
    'cost_item_catalog',
    'cost_category_tree',
    'project_expense_template',
    'specification_package',
    'process_template',
    'incentive_program',
    'structural_coefficient_set',
    'tax_and_index_rule',
    'object_cost_mapping',
    'space_shape_factor_rule',
    'utility_coefficient_set',
    'special_constraint_catalog',
    'facade_material_catalog',
    'space_type_category_map',
    'parametric_lump_sum_rule',
    'height_reference_catalog',
    'stakeholder_consent_rule',
    -- İP-4 (sürüm 1.4) — plan motorunun kuralları
    'unit_layout_rule',
    'building_element_rule'
  ];
BEGIN
  FOREACH t IN ARRAY frozen_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS datum_freeze ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER datum_freeze BEFORE INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION datum_reject_frozen_rule_mutation()', t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Sürümün kendisi: yayımlandıktan sonra yalnızca deprecated olabilir
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION datum_guard_version_row() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status::text IN ('published', 'deprecated') THEN
      RAISE EXCEPTION
        'DATUM_FROZEN: yayımlanmış bölge paketi sürümü silinemez (ilke 2). Yerine deprecated yapın.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status::text = 'published' THEN
    -- Yayımlanmış sürümde İÇERİK değişmez; yalnızca deprecated'a geçiş serbest.
    IF NEW."version" IS DISTINCT FROM OLD."version"
       OR NEW."effectiveFrom" IS DISTINCT FROM OLD."effectiveFrom"
       OR NEW."regionPackageId" IS DISTINCT FROM OLD."regionPackageId"
       OR NEW."tableHashes"::text IS DISTINCT FROM OLD."tableHashes"::text
       OR NEW."publishedAt" IS DISTINCT FROM OLD."publishedAt" THEN
      RAISE EXCEPTION
        'DATUM_FROZEN: yayımlanmış sürümün içeriği değiştirilemez (ilke 2).';
    END IF;

    IF NEW.status::text NOT IN ('published', 'deprecated') THEN
      RAISE EXCEPTION
        'DATUM_FROZEN: yayımlanmış sürüm yalnızca deprecated yapılabilir; "%" geçersiz.',
        NEW.status::text;
    END IF;
  END IF;

  IF OLD.status::text = 'deprecated' AND NEW.status::text <> 'deprecated' THEN
    RAISE EXCEPTION 'DATUM_FROZEN: deprecated bir sürüm geri alınamaz.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS datum_version_guard ON "region_package_version";
CREATE TRIGGER datum_version_guard
  BEFORE UPDATE OR DELETE ON "region_package_version"
  FOR EACH ROW EXECUTE FUNCTION datum_guard_version_row();

-- -----------------------------------------------------------------------------
-- 3. Project.regionPackageVersionId — SET-ONCE
--    null→değer  : serbest (proje pakete bağlanır, sürüm donar)
--    değer→değer : YALNIZCA aynı transaction'da `applied` bir
--                  ProjectPackageMigration varsa (:30 "yeni sürüme geçir")
--    Ayrıca: yalnızca `published` bir sürüme bağlanılabilir.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION datum_guard_project_version() RETURNS trigger AS $$
DECLARE
  target_status text;
BEGIN
  IF NEW."regionPackageVersionId" IS NOT NULL THEN
    SELECT status::text INTO target_status
      FROM "region_package_version"
     WHERE id = NEW."regionPackageVersionId";

    IF target_status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION
        'DATUM_NOT_PUBLISHED: proje yalnızca yayımlanmış bir bölge paketi sürümüne bağlanabilir; hedef sürüm "%" durumunda.',
        COALESCE(target_status, 'bulunamadı');
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD."regionPackageVersionId" IS NOT NULL
     AND NEW."regionPackageVersionId" IS DISTINCT FROM OLD."regionPackageVersionId" THEN

    IF NOT EXISTS (
      SELECT 1 FROM "project_package_migration" m
       WHERE m."projectId"     = NEW."id"
         AND m."fromVersionId" = OLD."regionPackageVersionId"
         AND m."toVersionId"   = NEW."regionPackageVersionId"
         AND m."status"::text  = 'applied'
    ) THEN
      RAISE EXCEPTION
        'DATUM_SET_ONCE: dondurulmuş sürüm doğrudan değiştirilemez. Önce `applied` bir ProjectPackageMigration kaydı oluşturun (ilke 2).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS datum_project_version_guard ON "project";
CREATE TRIGGER datum_project_version_guard
  BEFORE INSERT OR UPDATE ON "project"
  FOR EACH ROW EXECUTE FUNCTION datum_guard_project_version();
