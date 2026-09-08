-- =============================================================================
-- İP-1 — Temel altyapı, ilk migration
--
-- 1. Şema (Prisma tarafından üretildi)
-- 2. Hesaplanan alanların GENERATED kolonları (prisma/sql/computed-columns.sql)
-- 3. OverrideLedger view (prisma/sql/override-ledger.sql)
-- 4. Değişmezlik ve set-once trigger'ları (prisma/sql/immutability.sql)
--
-- 2 ve 3 ÜRETİLMİŞTİR. Hesaplanan alan eklendiğinde `npm run codegen` çalıştırıp
-- yeni bir migration üretin; bu dosyayı elle düzenlemeyin.
-- =============================================================================

-- ############ 1. ŞEMA ############

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('K1', 'K2', 'K3');

-- CreateEnum
CREATE TYPE "RegionPackageVersionStatus" AS ENUM ('draft', 'published', 'deprecated');

-- CreateEnum
CREATE TYPE "PackageMigrationStatus" AS ENUM ('pending', 'applied', 'rejected');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('yeniYapi', 'kentselDonusum', 'ilaveKat', 'guclendirme');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('taslak', 'onEleme', 'onEtut', 'detayliEtut', 'teklifVerildi', 'sozlesme', 'iptal');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('tekMalik', 'hisseli', 'katMulkiyeti', 'katIrtifaki');

-- CreateEnum
CREATE TYPE "StructuralAssessmentStatus" AS ENUM ('yapilmadi', 'riskliYapi', 'riskliDegil', 'itirazSurecinde');

-- CreateEnum
CREATE TYPE "BuildingOrder" AS ENUM ('ayrik', 'bitisik', 'blok', 'ikizNizam');

-- CreateEnum
CREATE TYPE "FarCalculationBasis" AS ENUM ('brut', 'net');

-- CreateEnum
CREATE TYPE "HeightReferenceMethod" AS ENUM ('tabiiZemin', 'tesviyeEdilmisZemin', 'yolKotu', 'binaGirisKotu');

-- CreateEnum
CREATE TYPE "LevelDataSource" AS ENUM ('resmiKroki', 'demServisi', 'manuel');

-- CreateEnum
CREATE TYPE "LiquefactionRisk" AS ENUM ('yok', 'dusuk', 'orta', 'yuksek');

-- CreateEnum
CREATE TYPE "FoundationType" AS ENUM ('radye', 'tekil', 'surekli', 'kazikli');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('salon', 'oturmaOdasi', 'yatakOdasi', 'ebeveynYatak', 'calismaOdasi', 'cocukOdasi', 'mutfak', 'banyo', 'ebeveynBanyo', 'wc', 'lavaboNis', 'camasirOdasi', 'hol', 'antre', 'koridor', 'icMerdiven', 'giyinmeOdasi', 'kiler', 'depo', 'ankastreDolapNis', 'balkon', 'fransizBalkon', 'teras', 'bahce', 'camBalkon', 'katHolu', 'merdivenHolu', 'binaGirisi', 'sigmanakKoridor');

-- CreateEnum
CREATE TYPE "SpaceCategory" AS ENUM ('yasam', 'islak', 'sirkulasyon', 'depolama', 'dis', 'ortak', 'servis');

-- CreateEnum
CREATE TYPE "CeilingType" AS ENUM ('duzAlci', 'alcipan', 'kartonpiyer', 'havuzTavan', 'yok');

-- CreateEnum
CREATE TYPE "HeatingElement" AS ENUM ('radyator', 'yerdenIsitma', 'yok');

-- CreateEnum
CREATE TYPE "VentilationType" AS ENUM ('dogal', 'saft', 'mekanik');

-- CreateEnum
CREATE TYPE "SkirtingType" AS ENUM ('seramik', 'ahsap', 'mdf', 'aluminyum', 'yok');

-- CreateEnum
CREATE TYPE "OpeningType" AS ENUM ('pencere', 'kapi', 'balkonKapisi', 'vitrin', 'garajKapisi');

-- CreateEnum
CREATE TYPE "FrameMaterial" AS ENUM ('pvc', 'aluminyum', 'ahsap', 'celik');

-- CreateEnum
CREATE TYPE "FrameType" AS ENUM ('tekKanat', 'ciftKanat', 'surme', 'vasistas');

-- CreateEnum
CREATE TYPE "GlazingType" AS ENUM ('tekCam', 'isicam', 'tripleCam', 'lamine');

-- CreateEnum
CREATE TYPE "ShutterType" AS ENUM ('panjur', 'stor', 'yok');

-- CreateEnum
CREATE TYPE "DoorType" AS ENUM ('celikKapi', 'ahsapKapi', 'camKapi', 'yanginKapisi');

-- CreateEnum
CREATE TYPE "FixtureType" AS ENUM ('klozet', 'gommeRezervuar', 'lavabo', 'lavaboDolabi', 'dusTeknesi', 'dusakabin', 'kuvet', 'evye', 'ocak', 'firin', 'davlumbaz', 'batarya', 'havlupan', 'aynaDolap', 'mutfakDolabi', 'tezgah', 'portmanto', 'dresuar');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('konut', 'ticari', 'ofis', 'depo');

-- CreateEnum
CREATE TYPE "FloorType" AS ENUM ('bodrum', 'zemin', 'normal', 'cekmeKat', 'catiArasi');

-- CreateEnum
CREATE TYPE "ElevatorType" AS ENUM ('insan', 'yuk', 'sedye', 'yangin');

-- CreateEnum
CREATE TYPE "ElevatorDoorType" AS ENUM ('otomatikTeleskopik', 'merkeziAcilim');

-- CreateEnum
CREATE TYPE "MachineRoomType" AS ENUM ('makineDairesiz', 'ustMakineDairesi', 'altMakineDairesi');

-- CreateEnum
CREATE TYPE "DriveType" AS ENUM ('halatli', 'hidrolik');

-- CreateEnum
CREATE TYPE "StairType" AS ENUM ('ana', 'yangin', 'servis', 'icDuplex');

-- CreateEnum
CREATE TYPE "FlightType" AS ENUM ('duzKollu', 'araSahanlikli', 'U', 'daire');

-- CreateEnum
CREATE TYPE "TreadMaterial" AS ENUM ('mermer', 'granit', 'seramik');

-- CreateEnum
CREATE TYPE "ShaftType" AS ENUM ('tesisat', 'havalandirma', 'cop', 'asansor', 'duman');

-- CreateEnum
CREATE TYPE "RailingType" AS ENUM ('metal', 'cam', 'ahsap', 'betonarme');

-- CreateEnum
CREATE TYPE "ServiceSpaceType" AS ENUM ('shelter', 'electricalRoom', 'waterTank', 'fireSystem', 'generator', 'heatingCenter', 'janitorApartment', 'wasteRoom', 'bicycleParking', 'cleaningRoom', 'managementOffice', 'socialArea');

-- CreateEnum
CREATE TYPE "ShelterType" AS ENUM ('serpinti', 'siginak');

-- CreateEnum
CREATE TYPE "ShelterVentilationSystemType" AS ENUM ('filtreli', 'dogal');

-- CreateEnum
CREATE TYPE "AlternativeUseWhenIdle" AS ENUM ('otopark', 'depo', 'sosyalAlan');

-- CreateEnum
CREATE TYPE "GeneratorScope" AS ENUM ('yok', 'ortakAlan', 'tamYedekleme');

-- CreateEnum
CREATE TYPE "HeatingSystemType" AS ENUM ('merkezi', 'bireysel', 'bolgesel');

-- CreateEnum
CREATE TYPE "ParkingType" AS ENUM ('acik', 'kapali', 'yariAcik', 'mekanik');

-- CreateEnum
CREATE TYPE "RoofType" AS ENUM ('kirma', 'duz', 'teras', 'celikKarkas');

-- CreateEnum
CREATE TYPE "OpeningDeductionRule" AS ENUM ('none', 'full', 'above_threshold', 'half_above_threshold');

-- CreateEnum
CREATE TYPE "SpecificationLevel" AS ENUM ('ekonomik', 'standart', 'ustSegment', 'luks');

-- CreateEnum
CREATE TYPE "AgreementStance" AS ENUM ('olumlu', 'kararsiz', 'itirazci');

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_package" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "adminUnit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "region_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_package_version" (
    "id" TEXT NOT NULL,
    "regionPackageId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "status" "RegionPackageVersionStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "clonedFromId" TEXT,
    "tableHashes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "region_package_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_package_migration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromVersionId" TEXT NOT NULL,
    "toVersionId" TEXT NOT NULL,
    "status" "PackageMigrationStatus" NOT NULL DEFAULT 'pending',
    "diff" JSONB,
    "staleOverrides" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_package_migration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoning_rule_set" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "farCalculationBasis" "FarCalculationBasis" NOT NULL,
    "heightReferenceMethod" "HeightReferenceMethod" NOT NULL,
    "farExemptionRules" JSONB,

    CONSTRAINT "zoning_rule_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "required_space_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "serviceSpaceType" "ServiceSpaceType" NOT NULL,
    "triggerType" TEXT NOT NULL,
    "threshold" DECIMAL(18,4) NOT NULL,
    "areaFormula" TEXT,

    CONSTRAINT "required_space_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "requirementFormula" TEXT NOT NULL,
    "spaceWidth" DECIMAL(6,2) NOT NULL,
    "spaceLength" DECIMAL(6,2) NOT NULL,
    "maxRampSlope" DECIMAL(5,4) NOT NULL,
    "accessibleRatio" DECIMAL(5,4) NOT NULL,
    "maneuveringAisleWidth" DECIMAL(6,2) NOT NULL,
    "bicycleRatio" DECIMAL(5,4),
    "electricChargingRatio" DECIMAL(5,4),

    CONSTRAINT "parking_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "elevatorRequiredFloorThreshold" INTEGER,
    "elevatorRequiredHeightThreshold" DECIMAL(6,2),
    "minElevatorCount" INTEGER,
    "stretcherElevatorRequired" BOOLEAN,
    "minStretcherCabinWidth" DECIMAL(6,2),
    "minStretcherCabinDepth" DECIMAL(6,2),
    "fireElevatorHeightThreshold" DECIMAL(6,2),
    "minStairWidth" DECIMAL(6,2),
    "maxEscapeDistance" DECIMAL(6,2),
    "elevatorKgPerPerson" DECIMAL(6,2),

    CONSTRAINT "core_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fire_safety_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "firePumpHeightThreshold" DECIMAL(6,2),
    "sprinklerAreaThreshold" DECIMAL(12,2),
    "detectorCoverageArea" DECIMAL(8,2),
    "pressurizationThreshold" DECIMAL(6,2),
    "fireReserveVolume" DECIMAL(10,2),
    "fireStairRequirements" JSONB,

    CONSTRAINT "fire_safety_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_item_catalog" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "costItemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "openingDeductionRule" "OpeningDeductionRule" NOT NULL DEFAULT 'none',
    "openingDeductionThreshold" DECIMAL(8,3),

    CONSTRAINT "cost_item_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_category_tree" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "name" TEXT NOT NULL,
    "parentRuleKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cost_category_tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_expense_template" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,

    CONSTRAINT "project_expense_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_package" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "level" "SpecificationLevel" NOT NULL,
    "scope" TEXT NOT NULL,
    "defaults" JSONB NOT NULL,

    CONSTRAINT "specification_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_template" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "name" TEXT NOT NULL,
    "stages" JSONB NOT NULL,
    "timeDependentCosts" JSONB,

    CONSTRAINT "process_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_program" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "name" TEXT NOT NULL,
    "eligibilityCondition" JSONB NOT NULL,
    "calculationRule" TEXT NOT NULL,
    "applicationSteps" JSONB,
    "paymentSchedule" JSONB,

    CONSTRAINT "incentive_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structural_coefficient_set" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "floorCountMin" INTEGER,
    "floorCountMax" INTEGER,
    "foundationType" "FoundationType",
    "concreteVolumePerArea" DECIMAL(10,4) NOT NULL,
    "rebarWeightPerVolume" DECIMAL(10,4) NOT NULL,
    "formworkAreaPerVolume" DECIMAL(10,4) NOT NULL,
    "formworkLaborRate" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "structural_coefficient_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_and_index_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(9,6),
    "indexSeries" JSONB,

    CONSTRAINT "tax_and_index_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_cost_mapping" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "objectType" TEXT NOT NULL,
    "objectVariant" TEXT,
    "costItemCode" TEXT NOT NULL,
    "quantityFormula" TEXT NOT NULL,
    "conditions" JSONB,

    CONSTRAINT "object_cost_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_shape_factor_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "spaceType" "SpaceType" NOT NULL,
    "shapeFactor" DECIMAL(8,4) NOT NULL,

    CONSTRAINT "space_shape_factor_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_coefficient_set" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "demandPowerPerUnit" DECIMAL(10,4),
    "demandPowerPerCommonArea" DECIMAL(10,6),
    "transformerPowerThreshold" DECIMAL(10,2),
    "personsPerUnit" DECIMAL(8,3),
    "litresPerPerson" DECIMAL(8,2),
    "generatorSizingFactor" DECIMAL(8,4),
    "heatLossPerArea" DECIMAL(10,3),
    "shelterAreaPerGasProofDoor" DECIMAL(10,3),
    "shelterAreaPerPerson" DECIMAL(8,3),
    "shelterPersonsPerUnit" DECIMAL(8,3),

    CONSTRAINT "utility_coefficient_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_constraint_catalog" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "labelKey" TEXT NOT NULL,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "special_constraint_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facade_material_catalog" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "labelKey" TEXT NOT NULL,
    "costItemCode" TEXT,

    CONSTRAINT "facade_material_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_type_category_map" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "spaceType" "SpaceType" NOT NULL,
    "category" "SpaceCategory" NOT NULL,
    "isWetArea" BOOLEAN NOT NULL DEFAULT false,
    "isRegionOverride" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "space_type_category_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametric_lump_sum_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "discipline" TEXT NOT NULL,
    "driverVariable" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "coefficient" DECIMAL(14,6) NOT NULL,
    "costItemCode" TEXT,

    CONSTRAINT "parametric_lump_sum_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'taslak',
    "tier" "Tier" NOT NULL,
    "regionPackageVersionId" TEXT,
    "currencyComputedValue" TEXT,
    "currencyOverrideValue" TEXT,
    "currencyOverrideReason" TEXT,
    "currency" TEXT,
    "priceReferenceDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "province" TEXT,
    "district" TEXT,
    "neighborhood" TEXT,
    "block" TEXT,
    "parcelNo" TEXT,
    "sheetNo" TEXT,
    "area" DECIMAL(12,2),
    "geometry" JSONB,
    "ownershipType" "OwnershipType",
    "ownerCount" INTEGER,
    "encumbrances" JSONB,
    "hasExistingBuilding" BOOLEAN NOT NULL DEFAULT false,
    "existingBuildingAge" INTEGER,
    "existingBuildingFloors" INTEGER,
    "existingBuildingUnitCount" INTEGER,
    "existingTotalArea" DECIMAL(12,2),
    "demolitionRequired" BOOLEAN NOT NULL DEFAULT false,
    "structuralAssessmentStatus" "StructuralAssessmentStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zoning_data" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "documentFile" TEXT,
    "planNotes" TEXT,
    "buildingOrder" "BuildingOrder",
    "groundCoverageRatio" DECIMAL(6,4),
    "floorAreaRatio" DECIMAL(6,4),
    "farCalculationBasis" "FarCalculationBasis",
    "setbackFront" DECIMAL(6,2),
    "setbackSide" DECIMAL(6,2),
    "setbackRear" DECIMAL(6,2),
    "maxFloorCount" INTEGER,
    "maxHeight" DECIMAL(6,2),
    "heightReferenceMethod" "HeightReferenceMethod",
    "roadFrontages" JSONB,
    "referenceLevel" DECIMAL(8,3),
    "cornerLevels" JSONB,
    "levelDataSource" "LevelDataSource",
    "specialConstraints" JSONB,
    "maxFootprintComputedValue" DECIMAL(14,3),
    "maxFootprintOverrideValue" DECIMAL(14,3),
    "maxFootprintOverrideReason" TEXT,
    "maxFootprint" DECIMAL(14,3),
    "maxTotalFloorAreaComputedValue" DECIMAL(14,3),
    "maxTotalFloorAreaOverrideValue" DECIMAL(14,3),
    "maxTotalFloorAreaOverrideReason" TEXT,
    "maxTotalFloorArea" DECIMAL(14,3),
    "buildableEnvelopeComputedValue" JSONB,
    "buildableEnvelopeOverrideValue" JSONB,
    "buildableEnvelopeOverrideReason" TEXT,
    "buildableEnvelope" JSONB,
    "basementGainFromLevelDifferenceComputedValue" DECIMAL(14,3),
    "basementGainFromLevelDifferenceOverrideValue" DECIMAL(14,3),
    "basementGainFromLevelDifferenceOverrideReason" TEXT,
    "basementGainFromLevelDifference" DECIMAL(14,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zoning_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soil_data" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "reportFile" TEXT,
    "soilClass" TEXT,
    "bearingCapacity" DECIMAL(10,3),
    "groundwaterLevel" DECIMAL(8,3),
    "liquefactionRisk" "LiquefactionRisk",
    "foundationType" "FoundationType",
    "pileRequired" BOOLEAN,
    "pileCount" INTEGER,
    "pileDepth" DECIMAL(8,3),
    "pileDiameter" DECIMAL(8,3),
    "shoringRequired" BOOLEAN,
    "shoringMethod" TEXT,
    "shoringArea" DECIMAL(12,3),
    "adjacentBuildingDistances" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soil_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_data" (
    "id" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "topographyLevelDifference" DECIMAL(8,3),
    "excavationHaulDistance" DECIMAL(8,2),
    "disposalSiteFee" DECIMAL(14,2),
    "siteAccessRoadWidth" DECIMAL(6,2),
    "craneFeasible" BOOLEAN,
    "utilityConnections" JSONB,
    "siteFencePerimeter" DECIMAL(10,2),
    "fencedSides" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "shareRatio" DECIMAL(9,6),
    "existingUnitArea" DECIMAL(12,2),
    "expectationNotes" TEXT,
    "agreementStance" "AgreementStance",
    "housingAidEligible" BOOLEAN,
    "housingAidMonths" INTEGER,
    "incentiveProgramEligible" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "floorNo" INTEGER NOT NULL,
    "floorType" "FloorType" NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "templateFloorId" TEXT,
    "grossHeight" DECIMAL(6,2),
    "clearHeight" DECIMAL(6,2),
    "grossAreaComputedValue" DECIMAL(14,3),
    "grossAreaOverrideValue" DECIMAL(14,3),
    "grossAreaOverrideReason" TEXT,
    "grossArea" DECIMAL(14,3),
    "hasCommercial" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_template" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_type" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitTypeCode" TEXT NOT NULL,
    "spaceList" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "unitNo" TEXT,
    "unitTypeCode" TEXT,
    "usageType" "UsageType",
    "isDuplex" BOOLEAN NOT NULL DEFAULT false,
    "grossAreaComputedValue" DECIMAL(12,3),
    "grossAreaOverrideValue" DECIMAL(12,3),
    "grossAreaOverrideReason" TEXT,
    "grossArea" DECIMAL(12,3),
    "netAreaComputedValue" DECIMAL(12,3),
    "netAreaOverrideValue" DECIMAL(12,3),
    "netAreaOverrideReason" TEXT,
    "netArea" DECIMAL(12,3),
    "balconyAreaComputedValue" DECIMAL(12,3),
    "balconyAreaOverrideValue" DECIMAL(12,3),
    "balconyAreaOverrideReason" TEXT,
    "balconyArea" DECIMAL(12,3),
    "commonAreaShareComputedValue" DECIMAL(12,3),
    "commonAreaShareOverrideValue" DECIMAL(12,3),
    "commonAreaShareOverrideReason" TEXT,
    "commonAreaShare" DECIMAL(12,3),
    "wetAreaTotalComputedValue" DECIMAL(12,3),
    "wetAreaTotalOverrideValue" DECIMAL(12,3),
    "wetAreaTotalOverrideReason" TEXT,
    "wetAreaTotal" DECIMAL(12,3),
    "landShareRatio" DECIMAL(9,6),
    "assignedStakeholderId" TEXT,
    "salePrice" DECIMAL(16,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT,
    "spaceType" "SpaceType" NOT NULL,
    "categoryComputedValue" "SpaceCategory",
    "categoryOverrideValue" "SpaceCategory",
    "categoryOverrideReason" TEXT,
    "category" "SpaceCategory",
    "area" DECIMAL(12,3),
    "width" DECIMAL(8,3),
    "length" DECIMAL(8,3),
    "geometry" JSONB,
    "perimeterComputedValue" DECIMAL(12,3),
    "perimeterOverrideValue" DECIMAL(12,3),
    "perimeterOverrideReason" TEXT,
    "perimeter" DECIMAL(12,3),
    "clearHeight" DECIMAL(6,3),
    "isWetAreaComputedValue" BOOLEAN,
    "isWetAreaOverrideValue" BOOLEAN,
    "isWetAreaOverrideReason" TEXT,
    "isWetArea" BOOLEAN,
    "floorFinishId" TEXT,
    "skirtingType" "SkirtingType",
    "skirtingHeight" DECIMAL(6,3),
    "wallFinishId" TEXT,
    "wallCladdingHeight" DECIMAL(6,3),
    "ceilingType" "CeilingType",
    "ceilingCorniceLengthComputedValue" DECIMAL(12,3),
    "ceilingCorniceLengthOverrideValue" DECIMAL(12,3),
    "ceilingCorniceLengthOverrideReason" TEXT,
    "ceilingCorniceLength" DECIMAL(12,3),
    "waterproofing" BOOLEAN NOT NULL DEFAULT false,
    "heatingElement" "HeatingElement",
    "heatingElementSizeComputedValue" DECIMAL(12,3),
    "heatingElementSizeOverrideValue" DECIMAL(12,3),
    "heatingElementSizeOverrideReason" TEXT,
    "heatingElementSize" DECIMAL(12,3),
    "hasAirConditioner" BOOLEAN NOT NULL DEFAULT false,
    "ventilationType" "VentilationType",
    "electricalPresetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opening" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "openingType" "OpeningType" NOT NULL,
    "adjacentSpaceId" TEXT,
    "isExterior" BOOLEAN NOT NULL DEFAULT false,
    "width" DECIMAL(8,3),
    "height" DECIMAL(8,3),
    "count" INTEGER NOT NULL DEFAULT 1,
    "frameMaterial" "FrameMaterial",
    "frameType" "FrameType",
    "glazingType" "GlazingType",
    "hasSill" BOOLEAN NOT NULL DEFAULT false,
    "hasArchitrave" BOOLEAN NOT NULL DEFAULT false,
    "shutterType" "ShutterType",
    "doorType" "DoorType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixture" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "fixtureType" "FixtureType" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lengthMeters" DECIMAL(8,3),
    "specLevel" "SpecificationLevel",
    "productRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surface_finish" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surface_finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_space" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elevator" (
    "id" TEXT NOT NULL,
    "coreId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "elevatorType" "ElevatorType",
    "capacityPersons" INTEGER,
    "capacityKgComputedValue" INTEGER,
    "capacityKgOverrideValue" INTEGER,
    "capacityKgOverrideReason" TEXT,
    "capacityKg" INTEGER,
    "speed" DECIMAL(6,3),
    "stopCountComputedValue" INTEGER,
    "stopCountOverrideValue" INTEGER,
    "stopCountOverrideReason" TEXT,
    "stopCount" INTEGER,
    "travelHeightComputedValue" DECIMAL(8,3),
    "travelHeightOverrideValue" DECIMAL(8,3),
    "travelHeightOverrideReason" TEXT,
    "travelHeight" DECIMAL(8,3),
    "cabinWidth" DECIMAL(6,3),
    "cabinDepth" DECIMAL(6,3),
    "cabinHeight" DECIMAL(6,3),
    "shaftWidth" DECIMAL(6,3),
    "shaftDepth" DECIMAL(6,3),
    "pitDepth" DECIMAL(6,3),
    "overheadHeight" DECIMAL(6,3),
    "doorType" "ElevatorDoorType",
    "doorWidth" DECIMAL(6,3),
    "machineRoomType" "MachineRoomType",
    "driveType" "DriveType",
    "cabinFinishLevel" "SpecificationLevel",
    "hasEmergencyRescue" BOOLEAN NOT NULL DEFAULT false,
    "hasBackupPower" BOOLEAN NOT NULL DEFAULT false,
    "certificationCost" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elevator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stair" (
    "id" TEXT NOT NULL,
    "coreId" TEXT NOT NULL,
    "stairType" "StairType",
    "flightType" "FlightType",
    "stepWidth" DECIMAL(6,3),
    "riserHeight" DECIMAL(6,3),
    "treadDepth" DECIMAL(6,3),
    "totalStepCountComputedValue" INTEGER,
    "totalStepCountOverrideValue" INTEGER,
    "totalStepCountOverrideReason" TEXT,
    "totalStepCount" INTEGER,
    "landingArea" DECIMAL(10,3),
    "railingType" "RailingType",
    "railingLengthComputedValue" DECIMAL(10,3),
    "railingLengthOverrideValue" DECIMAL(10,3),
    "railingLengthOverrideReason" TEXT,
    "railingLength" DECIMAL(10,3),
    "treadMaterial" "TreadMaterial",
    "isPressurized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shaft" (
    "id" TEXT NOT NULL,
    "coreId" TEXT NOT NULL,
    "shaftType" "ShaftType",
    "width" DECIMAL(6,3),
    "depth" DECIMAL(6,3),
    "runsThroughFloors" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shaft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_space" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "serviceType" "ServiceSpaceType" NOT NULL,
    "isMandatoryComputedValue" BOOLEAN,
    "isMandatoryOverrideValue" BOOLEAN,
    "isMandatoryOverrideReason" TEXT,
    "isMandatory" BOOLEAN,
    "area" DECIMAL(12,3),
    "width" DECIMAL(8,3),
    "length" DECIMAL(8,3),
    "clearHeight" DECIMAL(6,3),
    "location" TEXT,
    "floorFinish" TEXT,
    "wallFinish" TEXT,
    "hasVentilation" BOOLEAN NOT NULL DEFAULT false,
    "hasDrainage" BOOLEAN NOT NULL DEFAULT false,
    "hasFireRating" BOOLEAN NOT NULL DEFAULT false,
    "doorType" "DoorType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelter" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "isRequiredComputedValue" BOOLEAN,
    "isRequiredOverrideValue" BOOLEAN,
    "isRequiredOverrideReason" TEXT,
    "isRequired" BOOLEAN,
    "requiredCapacityPersonsComputedValue" INTEGER,
    "requiredCapacityPersonsOverrideValue" INTEGER,
    "requiredCapacityPersonsOverrideReason" TEXT,
    "requiredCapacityPersons" INTEGER,
    "areaPerPerson" DECIMAL(8,3),
    "totalAreaComputedValue" DECIMAL(12,3),
    "totalAreaOverrideValue" DECIMAL(12,3),
    "totalAreaOverrideReason" TEXT,
    "totalArea" DECIMAL(12,3),
    "shelterType" "ShelterType",
    "wcCount" INTEGER,
    "showerCount" INTEGER,
    "hasKitchenette" BOOLEAN NOT NULL DEFAULT false,
    "gasProofDoorCountComputedValue" INTEGER,
    "gasProofDoorCountOverrideValue" INTEGER,
    "gasProofDoorCountOverrideReason" TEXT,
    "gasProofDoorCount" INTEGER,
    "gasProofDoorType" TEXT,
    "ventilationSystemType" "ShelterVentilationSystemType",
    "ventilationUnitCount" INTEGER,
    "emergencyExitCount" INTEGER,
    "floorFinishType" TEXT,
    "wallStructureThickness" DECIMAL(6,3),
    "hasBackupPower" BOOLEAN NOT NULL DEFAULT false,
    "alternativeUseWhenIdle" "AlternativeUseWhenIdle",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electrical_room" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "isTransformerRequiredComputedValue" BOOLEAN,
    "isTransformerRequiredOverrideValue" BOOLEAN,
    "isTransformerRequiredOverrideReason" TEXT,
    "isTransformerRequired" BOOLEAN,
    "demandPowerKWComputedValue" DECIMAL(12,3),
    "demandPowerKWOverrideValue" DECIMAL(12,3),
    "demandPowerKWOverrideReason" TEXT,
    "demandPowerKW" DECIMAL(12,3),
    "transformerCapacityKVA" DECIMAL(12,2),
    "transformerCount" INTEGER,
    "hasSeparateEntrance" BOOLEAN NOT NULL DEFAULT false,
    "hasVentilation" BOOLEAN NOT NULL DEFAULT false,
    "roomArea" DECIMAL(10,3),
    "distributionPanelCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "electrical_room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_tank" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "domesticWaterVolumeComputedValue" DECIMAL(12,3),
    "domesticWaterVolumeOverrideValue" DECIMAL(12,3),
    "domesticWaterVolumeOverrideReason" TEXT,
    "domesticWaterVolume" DECIMAL(12,3),
    "fireReserveVolume" DECIMAL(12,3),
    "totalVolume" DECIMAL(12,3),
    "tankMaterial" TEXT,
    "hydrophoreCount" INTEGER,
    "hydrophorePower" DECIMAL(10,3),
    "submersiblePumpCount" INTEGER,
    "waterproofingAreaComputedValue" DECIMAL(12,3),
    "waterproofingAreaOverrideValue" DECIMAL(12,3),
    "waterproofingAreaOverrideReason" TEXT,
    "waterproofingArea" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "water_tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fire_system" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "isFirePumpRequiredComputedValue" BOOLEAN,
    "isFirePumpRequiredOverrideValue" BOOLEAN,
    "isFirePumpRequiredOverrideReason" TEXT,
    "isFirePumpRequired" BOOLEAN,
    "pumpRoomArea" DECIMAL(10,3),
    "pumpCount" INTEGER,
    "pumpPower" DECIMAL(10,3),
    "sprinklerRequiredComputedValue" BOOLEAN,
    "sprinklerRequiredOverrideValue" BOOLEAN,
    "sprinklerRequiredOverrideReason" TEXT,
    "sprinklerRequired" BOOLEAN,
    "sprinklerCoverageArea" DECIMAL(12,3),
    "hydrantCount" INTEGER,
    "fireCabinetCount" INTEGER,
    "detectorCountComputedValue" INTEGER,
    "detectorCountOverrideValue" INTEGER,
    "detectorCountOverrideReason" TEXT,
    "detectorCount" INTEGER,
    "alarmPanelCount" INTEGER,
    "pressurizationFanCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fire_system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generator" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "scope" "GeneratorScope",
    "capacityKVAComputedValue" DECIMAL(12,2),
    "capacityKVAOverrideValue" DECIMAL(12,2),
    "capacityKVAOverrideReason" TEXT,
    "capacityKVA" DECIMAL(12,2),
    "fuelTankVolume" DECIMAL(10,3),
    "roomArea" DECIMAL(10,3),
    "exhaustSystemLength" DECIMAL(10,3),
    "soundproofingArea" DECIMAL(10,3),
    "ventilationOpeningArea" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heating_center" (
    "id" TEXT NOT NULL,
    "serviceSpaceId" TEXT NOT NULL,
    "heatingSystemType" "HeatingSystemType",
    "boilerType" TEXT,
    "boilerCapacityKcalComputedValue" DECIMAL(14,2),
    "boilerCapacityKcalOverrideValue" DECIMAL(14,2),
    "boilerCapacityKcalOverrideReason" TEXT,
    "boilerCapacityKcal" DECIMAL(14,2),
    "boilerCount" INTEGER,
    "roomArea" DECIMAL(10,3),
    "chimneyHeight" DECIMAL(8,3),
    "chimneyDiameter" DECIMAL(8,3),
    "heatMeterCountComputedValue" INTEGER,
    "heatMeterCountOverrideValue" INTEGER,
    "heatMeterCountOverrideReason" TEXT,
    "heatMeterCount" INTEGER,
    "hotWaterMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "heating_center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_layout" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requiredCountComputedValue" INTEGER,
    "requiredCountOverrideValue" INTEGER,
    "requiredCountOverrideReason" TEXT,
    "requiredCount" INTEGER,
    "targetCount" INTEGER,
    "plannedCountComputedValue" INTEGER,
    "plannedCountOverrideValue" INTEGER,
    "plannedCountOverrideReason" TEXT,
    "plannedCount" INTEGER,
    "deficitCountComputedValue" INTEGER,
    "deficitCountOverrideValue" INTEGER,
    "deficitCountOverrideReason" TEXT,
    "deficitCount" INTEGER,
    "parkingType" "ParkingType",
    "basementFloorCountComputedValue" INTEGER,
    "basementFloorCountOverrideValue" INTEGER,
    "basementFloorCountOverrideReason" TEXT,
    "basementFloorCount" INTEGER,
    "accessibleSpaceCountComputedValue" INTEGER,
    "accessibleSpaceCountOverrideValue" INTEGER,
    "accessibleSpaceCountOverrideReason" TEXT,
    "accessibleSpaceCount" INTEGER,
    "electricChargingCount" INTEGER,
    "bicycleSpaceCountComputedValue" INTEGER,
    "bicycleSpaceCountOverrideValue" INTEGER,
    "bicycleSpaceCountOverrideReason" TEXT,
    "bicycleSpaceCount" INTEGER,
    "maneuveringAisleWidth" DECIMAL(6,2),
    "markingLengthComputedValue" DECIMAL(12,3),
    "markingLengthOverrideValue" DECIMAL(12,3),
    "markingLengthOverrideReason" TEXT,
    "markingLength" DECIMAL(12,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_layout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_space" (
    "id" TEXT NOT NULL,
    "parkingLayoutId" TEXT NOT NULL,
    "width" DECIMAL(6,2),
    "length" DECIMAL(6,2),
    "isAccessible" BOOLEAN NOT NULL DEFAULT false,
    "isMechanical" BOOLEAN NOT NULL DEFAULT false,
    "assignedUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parking_space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ramp" (
    "id" TEXT NOT NULL,
    "parkingLayoutId" TEXT NOT NULL,
    "slope" DECIMAL(6,4),
    "width" DECIMAL(6,2),
    "lengthComputedValue" DECIMAL(10,3),
    "lengthOverrideValue" DECIMAL(10,3),
    "lengthOverrideReason" TEXT,
    "length" DECIMAL(10,3),
    "isCovered" BOOLEAN NOT NULL DEFAULT false,
    "hasHeating" BOOLEAN NOT NULL DEFAULT false,
    "shutterType" "ShutterType",
    "turningRadius" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ramp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facade" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "facadeNo" INTEGER NOT NULL,
    "orientation" TEXT,
    "widthComputedValue" DECIMAL(10,3),
    "widthOverrideValue" DECIMAL(10,3),
    "widthOverrideReason" TEXT,
    "width" DECIMAL(10,3),
    "heightComputedValue" DECIMAL(10,3),
    "heightOverrideValue" DECIMAL(10,3),
    "heightOverrideReason" TEXT,
    "height" DECIMAL(10,3),
    "grossAreaComputedValue" DECIMAL(12,3),
    "grossAreaOverrideValue" DECIMAL(12,3),
    "grossAreaOverrideReason" TEXT,
    "grossArea" DECIMAL(12,3),
    "openingAreaComputedValue" DECIMAL(12,3),
    "openingAreaOverrideValue" DECIMAL(12,3),
    "openingAreaOverrideReason" TEXT,
    "openingArea" DECIMAL(12,3),
    "netAreaComputedValue" DECIMAL(12,3),
    "netAreaOverrideValue" DECIMAL(12,3),
    "netAreaOverrideReason" TEXT,
    "netArea" DECIMAL(12,3),
    "insulationType" TEXT,
    "insulationThickness" DECIMAL(6,3),
    "insulationAreaComputedValue" DECIMAL(12,3),
    "insulationAreaOverrideValue" DECIMAL(12,3),
    "insulationAreaOverrideReason" TEXT,
    "insulationArea" DECIMAL(12,3),
    "scaffoldingArea" DECIMAL(12,3),
    "scaffoldingMonths" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facade_material" (
    "id" TEXT NOT NULL,
    "facadeId" TEXT NOT NULL,
    "catalogId" TEXT,
    "ratioPercent" DECIMAL(6,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facade_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roof" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "roofType" "RoofType",
    "structureMaterial" TEXT,
    "structureWeightComputedValue" DECIMAL(14,3),
    "structureWeightOverrideValue" DECIMAL(14,3),
    "structureWeightOverrideReason" TEXT,
    "structureWeight" DECIMAL(14,3),
    "coveringType" TEXT,
    "coveringAreaComputedValue" DECIMAL(12,3),
    "coveringAreaOverrideValue" DECIMAL(12,3),
    "coveringAreaOverrideReason" TEXT,
    "coveringArea" DECIMAL(12,3),
    "insulationType" TEXT,
    "insulationThickness" DECIMAL(6,3),
    "insulationArea" DECIMAL(12,3),
    "waterproofingType" TEXT,
    "waterproofingArea" DECIMAL(12,3),
    "gutterType" TEXT,
    "gutterLength" DECIMAL(10,3),
    "downspoutCount" INTEGER,
    "hasConcreteSlab" BOOLEAN NOT NULL DEFAULT false,
    "parapetHeight" DECIMAL(6,3),
    "parapetLength" DECIMAL(10,3),
    "hasSkylight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landscape" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gardenWallLength" DECIMAL(10,3),
    "gardenWallHeight" DECIMAL(6,3),
    "lawnArea" DECIMAL(12,3),
    "plantingBudget" DECIMAL(14,2),
    "irrigationSystem" TEXT,
    "hardscapeArea" DECIMAL(12,3),
    "outdoorLightingCount" INTEGER,
    "playgroundArea" DECIMAL(12,3),
    "fenceLength" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landscape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specification_set" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "selectedLevel" "SpecificationLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specification_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quantity_takeoff" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quantity_takeoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quantity_line" (
    "id" TEXT NOT NULL,
    "quantityTakeoffId" TEXT NOT NULL,
    "costItemCode" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sourceObjectType" TEXT,
    "sourceObjectId" TEXT,
    "formula" TEXT,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quantity_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_estimate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_line" (
    "id" TEXT NOT NULL,
    "costEstimateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_instance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "processTemplateRuleKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage" (
    "id" TEXT NOT NULL,
    "processInstanceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feasibility_result" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feasibility_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "region_package_organizationId_idx" ON "region_package"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "region_package_organizationId_country_adminUnit_name_key" ON "region_package"("organizationId", "country", "adminUnit", "name");

-- CreateIndex
CREATE INDEX "region_package_version_regionPackageId_status_idx" ON "region_package_version"("regionPackageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "region_package_version_regionPackageId_version_key" ON "region_package_version"("regionPackageId", "version");

-- CreateIndex
CREATE INDEX "project_package_migration_projectId_status_idx" ON "project_package_migration"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "zoning_rule_set_regionPackageVersionId_ruleKey_key" ON "zoning_rule_set"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "required_space_rule_regionPackageVersionId_ruleKey_key" ON "required_space_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "parking_rule_regionPackageVersionId_ruleKey_key" ON "parking_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "core_rule_regionPackageVersionId_ruleKey_key" ON "core_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "fire_safety_rule_regionPackageVersionId_ruleKey_key" ON "fire_safety_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "cost_item_catalog_regionPackageVersionId_ruleKey_key" ON "cost_item_catalog"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "cost_item_catalog_regionPackageVersionId_costItemCode_key" ON "cost_item_catalog"("regionPackageVersionId", "costItemCode");

-- CreateIndex
CREATE UNIQUE INDEX "cost_category_tree_regionPackageVersionId_ruleKey_key" ON "cost_category_tree"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "project_expense_template_regionPackageVersionId_ruleKey_key" ON "project_expense_template"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "specification_package_regionPackageVersionId_ruleKey_key" ON "specification_package"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "process_template_regionPackageVersionId_ruleKey_key" ON "process_template"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "incentive_program_regionPackageVersionId_ruleKey_key" ON "incentive_program"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "structural_coefficient_set_regionPackageVersionId_ruleKey_key" ON "structural_coefficient_set"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "tax_and_index_rule_regionPackageVersionId_ruleKey_key" ON "tax_and_index_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE INDEX "object_cost_mapping_regionPackageVersionId_objectType_idx" ON "object_cost_mapping"("regionPackageVersionId", "objectType");

-- CreateIndex
CREATE UNIQUE INDEX "object_cost_mapping_regionPackageVersionId_ruleKey_key" ON "object_cost_mapping"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "space_shape_factor_rule_regionPackageVersionId_ruleKey_key" ON "space_shape_factor_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "space_shape_factor_rule_regionPackageVersionId_spaceType_key" ON "space_shape_factor_rule"("regionPackageVersionId", "spaceType");

-- CreateIndex
CREATE UNIQUE INDEX "utility_coefficient_set_regionPackageVersionId_ruleKey_key" ON "utility_coefficient_set"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "special_constraint_catalog_regionPackageVersionId_ruleKey_key" ON "special_constraint_catalog"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "facade_material_catalog_regionPackageVersionId_ruleKey_key" ON "facade_material_catalog"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "space_type_category_map_regionPackageVersionId_ruleKey_key" ON "space_type_category_map"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "space_type_category_map_regionPackageVersionId_spaceType_key" ON "space_type_category_map"("regionPackageVersionId", "spaceType");

-- CreateIndex
CREATE UNIQUE INDEX "parametric_lump_sum_rule_regionPackageVersionId_ruleKey_key" ON "parametric_lump_sum_rule"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE INDEX "project_organizationId_status_idx" ON "project"("organizationId", "status");

-- CreateIndex
CREATE INDEX "project_organizationId_tier_idx" ON "project"("organizationId", "tier");

-- CreateIndex
CREATE INDEX "project_regionPackageVersionId_idx" ON "project"("regionPackageVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "parcel_projectId_key" ON "parcel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "zoning_data_parcelId_key" ON "zoning_data"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "soil_data_parcelId_key" ON "soil_data"("parcelId");

-- CreateIndex
CREATE UNIQUE INDEX "site_data_parcelId_key" ON "site_data"("parcelId");

-- CreateIndex
CREATE INDEX "stakeholder_projectId_idx" ON "stakeholder"("projectId");

-- CreateIndex
CREATE INDEX "block_projectId_idx" ON "block"("projectId");

-- CreateIndex
CREATE INDEX "floor_blockId_idx" ON "floor"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "floor_blockId_floorNo_key" ON "floor"("blockId", "floorNo");

-- CreateIndex
CREATE UNIQUE INDEX "unit_type_projectId_unitTypeCode_key" ON "unit_type"("projectId", "unitTypeCode");

-- CreateIndex
CREATE INDEX "unit_floorId_idx" ON "unit"("floorId");

-- CreateIndex
CREATE INDEX "unit_assignedStakeholderId_idx" ON "unit"("assignedStakeholderId");

-- CreateIndex
CREATE INDEX "space_unitId_idx" ON "space"("unitId");

-- CreateIndex
CREATE INDEX "space_spaceType_idx" ON "space"("spaceType");

-- CreateIndex
CREATE INDEX "opening_spaceId_idx" ON "opening"("spaceId");

-- CreateIndex
CREATE INDEX "opening_adjacentSpaceId_idx" ON "opening"("adjacentSpaceId");

-- CreateIndex
CREATE INDEX "fixture_spaceId_idx" ON "fixture"("spaceId");

-- CreateIndex
CREATE INDEX "common_space_floorId_idx" ON "common_space"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "core_blockId_key" ON "core"("blockId");

-- CreateIndex
CREATE INDEX "elevator_coreId_idx" ON "elevator"("coreId");

-- CreateIndex
CREATE INDEX "stair_coreId_idx" ON "stair"("coreId");

-- CreateIndex
CREATE INDEX "shaft_coreId_idx" ON "shaft"("coreId");

-- CreateIndex
CREATE INDEX "service_space_floorId_serviceType_idx" ON "service_space"("floorId", "serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "shelter_serviceSpaceId_key" ON "shelter"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "electrical_room_serviceSpaceId_key" ON "electrical_room"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "water_tank_serviceSpaceId_key" ON "water_tank"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "fire_system_serviceSpaceId_key" ON "fire_system"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "generator_serviceSpaceId_key" ON "generator"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "heating_center_serviceSpaceId_key" ON "heating_center"("serviceSpaceId");

-- CreateIndex
CREATE UNIQUE INDEX "parking_layout_projectId_key" ON "parking_layout"("projectId");

-- CreateIndex
CREATE INDEX "parking_space_parkingLayoutId_idx" ON "parking_space"("parkingLayoutId");

-- CreateIndex
CREATE INDEX "parking_space_assignedUnitId_idx" ON "parking_space"("assignedUnitId");

-- CreateIndex
CREATE INDEX "ramp_parkingLayoutId_idx" ON "ramp"("parkingLayoutId");

-- CreateIndex
CREATE INDEX "facade_blockId_idx" ON "facade"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "facade_blockId_facadeNo_key" ON "facade"("blockId", "facadeNo");

-- CreateIndex
CREATE INDEX "facade_material_facadeId_idx" ON "facade_material"("facadeId");

-- CreateIndex
CREATE UNIQUE INDEX "roof_blockId_key" ON "roof"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "landscape_projectId_key" ON "landscape"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "specification_set_projectId_key" ON "specification_set"("projectId");

-- CreateIndex
CREATE INDEX "quantity_takeoff_projectId_idx" ON "quantity_takeoff"("projectId");

-- CreateIndex
CREATE INDEX "quantity_line_quantityTakeoffId_idx" ON "quantity_line"("quantityTakeoffId");

-- CreateIndex
CREATE INDEX "quantity_line_costItemCode_idx" ON "quantity_line"("costItemCode");

-- CreateIndex
CREATE INDEX "quantity_line_sourceObjectType_sourceObjectId_idx" ON "quantity_line"("sourceObjectType", "sourceObjectId");

-- CreateIndex
CREATE INDEX "cost_estimate_projectId_idx" ON "cost_estimate"("projectId");

-- CreateIndex
CREATE INDEX "cost_line_costEstimateId_idx" ON "cost_line"("costEstimateId");

-- CreateIndex
CREATE UNIQUE INDEX "process_instance_projectId_key" ON "process_instance"("projectId");

-- CreateIndex
CREATE INDEX "stage_processInstanceId_idx" ON "stage"("processInstanceId");

-- CreateIndex
CREATE INDEX "step_stageId_idx" ON "step"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "feasibility_result_projectId_key" ON "feasibility_result"("projectId");

-- AddForeignKey
ALTER TABLE "region_package" ADD CONSTRAINT "region_package_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_package_version" ADD CONSTRAINT "region_package_version_regionPackageId_fkey" FOREIGN KEY ("regionPackageId") REFERENCES "region_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_package_version" ADD CONSTRAINT "region_package_version_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "region_package_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_package_migration" ADD CONSTRAINT "project_package_migration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_package_migration" ADD CONSTRAINT "project_package_migration_fromVersionId_fkey" FOREIGN KEY ("fromVersionId") REFERENCES "region_package_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_package_migration" ADD CONSTRAINT "project_package_migration_toVersionId_fkey" FOREIGN KEY ("toVersionId") REFERENCES "region_package_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoning_rule_set" ADD CONSTRAINT "zoning_rule_set_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "required_space_rule" ADD CONSTRAINT "required_space_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_rule" ADD CONSTRAINT "parking_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_rule" ADD CONSTRAINT "core_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fire_safety_rule" ADD CONSTRAINT "fire_safety_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_item_catalog" ADD CONSTRAINT "cost_item_catalog_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_category_tree" ADD CONSTRAINT "cost_category_tree_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_expense_template" ADD CONSTRAINT "project_expense_template_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_package" ADD CONSTRAINT "specification_package_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_template" ADD CONSTRAINT "process_template_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_program" ADD CONSTRAINT "incentive_program_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structural_coefficient_set" ADD CONSTRAINT "structural_coefficient_set_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_and_index_rule" ADD CONSTRAINT "tax_and_index_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "object_cost_mapping" ADD CONSTRAINT "object_cost_mapping_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_shape_factor_rule" ADD CONSTRAINT "space_shape_factor_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_coefficient_set" ADD CONSTRAINT "utility_coefficient_set_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_constraint_catalog" ADD CONSTRAINT "special_constraint_catalog_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facade_material_catalog" ADD CONSTRAINT "facade_material_catalog_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_type_category_map" ADD CONSTRAINT "space_type_category_map_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametric_lump_sum_rule" ADD CONSTRAINT "parametric_lump_sum_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcel" ADD CONSTRAINT "parcel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zoning_data" ADD CONSTRAINT "zoning_data_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soil_data" ADD CONSTRAINT "soil_data_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_data" ADD CONSTRAINT "site_data_parcelId_fkey" FOREIGN KEY ("parcelId") REFERENCES "parcel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakeholder" ADD CONSTRAINT "stakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block" ADD CONSTRAINT "block_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor" ADD CONSTRAINT "floor_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor" ADD CONSTRAINT "floor_templateFloorId_fkey" FOREIGN KEY ("templateFloorId") REFERENCES "floor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_assignedStakeholderId_fkey" FOREIGN KEY ("assignedStakeholderId") REFERENCES "stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space" ADD CONSTRAINT "space_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space" ADD CONSTRAINT "space_floorFinishId_fkey" FOREIGN KEY ("floorFinishId") REFERENCES "surface_finish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space" ADD CONSTRAINT "space_wallFinishId_fkey" FOREIGN KEY ("wallFinishId") REFERENCES "surface_finish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening" ADD CONSTRAINT "opening_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening" ADD CONSTRAINT "opening_adjacentSpaceId_fkey" FOREIGN KEY ("adjacentSpaceId") REFERENCES "space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixture" ADD CONSTRAINT "fixture_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_space" ADD CONSTRAINT "common_space_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core" ADD CONSTRAINT "core_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elevator" ADD CONSTRAINT "elevator_coreId_fkey" FOREIGN KEY ("coreId") REFERENCES "core"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stair" ADD CONSTRAINT "stair_coreId_fkey" FOREIGN KEY ("coreId") REFERENCES "core"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shaft" ADD CONSTRAINT "shaft_coreId_fkey" FOREIGN KEY ("coreId") REFERENCES "core"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_space" ADD CONSTRAINT "service_space_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelter" ADD CONSTRAINT "shelter_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electrical_room" ADD CONSTRAINT "electrical_room_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_tank" ADD CONSTRAINT "water_tank_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fire_system" ADD CONSTRAINT "fire_system_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generator" ADD CONSTRAINT "generator_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heating_center" ADD CONSTRAINT "heating_center_serviceSpaceId_fkey" FOREIGN KEY ("serviceSpaceId") REFERENCES "service_space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_layout" ADD CONSTRAINT "parking_layout_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_space" ADD CONSTRAINT "parking_space_parkingLayoutId_fkey" FOREIGN KEY ("parkingLayoutId") REFERENCES "parking_layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_space" ADD CONSTRAINT "parking_space_assignedUnitId_fkey" FOREIGN KEY ("assignedUnitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ramp" ADD CONSTRAINT "ramp_parkingLayoutId_fkey" FOREIGN KEY ("parkingLayoutId") REFERENCES "parking_layout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facade" ADD CONSTRAINT "facade_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facade_material" ADD CONSTRAINT "facade_material_facadeId_fkey" FOREIGN KEY ("facadeId") REFERENCES "facade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facade_material" ADD CONSTRAINT "facade_material_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "facade_material_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roof" ADD CONSTRAINT "roof_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landscape" ADD CONSTRAINT "landscape_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specification_set" ADD CONSTRAINT "specification_set_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quantity_takeoff" ADD CONSTRAINT "quantity_takeoff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quantity_line" ADD CONSTRAINT "quantity_line_quantityTakeoffId_fkey" FOREIGN KEY ("quantityTakeoffId") REFERENCES "quantity_takeoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_estimate" ADD CONSTRAINT "cost_estimate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_line" ADD CONSTRAINT "cost_line_costEstimateId_fkey" FOREIGN KEY ("costEstimateId") REFERENCES "cost_estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage" ADD CONSTRAINT "stage_processInstanceId_fkey" FOREIGN KEY ("processInstanceId") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step" ADD CONSTRAINT "step_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feasibility_result" ADD CONSTRAINT "feasibility_result_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ############ 2. GENERATED KOLONLAR ############

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

-- Elevator (elevator)
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


-- ############ 3. OVERRIDE LEDGER ############

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


-- ############ 4. DEĞİŞMEZLİK ############

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
    'parametric_lump_sum_rule'
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
