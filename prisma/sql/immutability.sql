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
