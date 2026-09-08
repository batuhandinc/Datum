-- =============================================================================
-- İP-2 şema değişiklikleri — veri modeli sürüm 1.2
--
-- 1. HeightReferenceMethod kod enum'u KALDIRILDI → HeightReferenceCatalog tablosu
--    (ilke 1: değerleri uydurulmuştu ve paket verisi onu kullanıyordu)
-- 2. ZoningRuleSet.offsetJoinType — çekme ötelemesinde köşe davranışı, PAKETTEN
-- 3. StakeholderConsentRule — karar çoğunluğu eşiği (A4 çoğunluk göstergesi için)
-- 4. SpecialConstraintCatalog.effectTarget/effectKind — kısıtın L0'a etkisi
-- 5. Parcel'e coğrafi referans alanları
--
-- Kural tabloları 20 → 22. Değişmezlik trigger'ları yeniden kurulur (dosya
-- idempotent: DROP TRIGGER IF EXISTS + CREATE), böylece iki yeni tablo da donar.
-- =============================================================================

-- CreateEnum
CREATE TYPE "OffsetJoinType" AS ENUM ('miter', 'round');

-- CreateEnum
CREATE TYPE "ConstraintEffectTarget" AS ENUM ('maxHeight', 'maxFootprint', 'floorAreaRatio', 'none');

-- CreateEnum
CREATE TYPE "ConstraintEffectKind" AS ENUM ('cap', 'multiply', 'subtract', 'none');

-- CreateTable
CREATE TABLE "height_reference_catalog" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "labelKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "height_reference_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stakeholder_consent_rule" (
    "id" TEXT NOT NULL,
    "regionPackageVersionId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "rowHash" TEXT,
    "majorityThreshold" DECIMAL(6,4) NOT NULL,
    "objectionPeriodDays" INTEGER,

    CONSTRAINT "stakeholder_consent_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "height_reference_catalog_regionPackageVersionId_ruleKey_key" ON "height_reference_catalog"("regionPackageVersionId", "ruleKey");

-- CreateIndex
CREATE UNIQUE INDEX "stakeholder_consent_rule_regionPackageVersionId_ruleKey_key" ON "stakeholder_consent_rule"("regionPackageVersionId", "ruleKey");

-- AddForeignKey
ALTER TABLE "height_reference_catalog" ADD CONSTRAINT "height_reference_catalog_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stakeholder_consent_rule" ADD CONSTRAINT "stakeholder_consent_rule_regionPackageVersionId_fkey" FOREIGN KEY ("regionPackageVersionId") REFERENCES "region_package_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable — ZoningRuleSet: enum kolonu düşür, katalog anahtarı ve köşe davranışı ekle
ALTER TABLE "zoning_rule_set" DROP COLUMN "heightReferenceMethod";
ALTER TABLE "zoning_rule_set" ADD COLUMN "heightReferenceRuleKey" TEXT;
ALTER TABLE "zoning_rule_set" ADD COLUMN "offsetJoinType" "OffsetJoinType";

-- AlterTable — ZoningData: aynı geçiş
ALTER TABLE "zoning_data" DROP COLUMN "heightReferenceMethod";
ALTER TABLE "zoning_data" ADD COLUMN "heightReferenceRuleKey" TEXT;

-- DropEnum — artık hiçbir kolon kullanmıyor
DROP TYPE "HeightReferenceMethod";

-- AlterTable — özel kısıtın L0'a etkisi
ALTER TABLE "special_constraint_catalog" ADD COLUMN "effectTarget" "ConstraintEffectTarget" NOT NULL DEFAULT 'none';
ALTER TABLE "special_constraint_catalog" ADD COLUMN "effectKind" "ConstraintEffectKind" NOT NULL DEFAULT 'none';

-- AlterTable — yerel metrik çerçeveyi dünyaya bağlayan alanlar
ALTER TABLE "parcel" ADD COLUMN "centerLatitude" DECIMAL(10,7);
ALTER TABLE "parcel" ADD COLUMN "centerLongitude" DECIMAL(10,7);
ALTER TABLE "parcel" ADD COLUMN "epsgCode" TEXT;
ALTER TABLE "parcel" ADD COLUMN "rotation" DECIMAL(8,5);

-- =============================================================================
-- Değişmezlik trigger'ları yeniden kurulur — iki yeni kural tablosu da donsun.
-- prisma/sql/immutability.sql ile BİREBİR AYNI olmalıdır (bir test doğrular).
-- =============================================================================

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
    'stakeholder_consent_rule'
  ];
BEGIN
  FOREACH t IN ARRAY frozen_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS datum_freeze ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER datum_freeze BEFORE INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION datum_reject_frozen_rule_mutation()', t);
  END LOOP;
END $$;
