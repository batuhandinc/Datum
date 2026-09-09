import type {
  CoreRule,
  FireSafetyRule,
  HeightReferenceCatalog,
  ParkingRule,
  PrismaClient,
  RequiredSpaceRule,
  SpaceShapeFactorRule,
  SpaceTypeCategoryMap,
  SpecialConstraintCatalog,
  StakeholderConsentRule,
  UtilityCoefficientSet,
  ZoningRuleSet,
} from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * KURAL MOTORU — bölge paketinden kural okuma.
 *
 * BU MODÜL, KURAL TABLOLARINI OKUMANIN TEK MEŞRU YOLUDUR.
 *
 * Neden: kural tabloları `ORG_SCOPED_MODELS` içinde DEĞİLDİR, dolayısıyla
 * `db().zoningRuleSet.findFirst(...)` kiracı filtresinden geçmez. Dahası,
 * sürüm filtresini unutan bir sorgu YANLIŞ PAKETİ okur ve makul görünen,
 * sessizce yanlış bir sayı üretir. Bu, sistemdeki en pahalı hata biçimidir.
 *
 * Okuyucu iki güvenceyi birden verir:
 *   1. Proje org-filtreli okunur (`db()`), sürümün organizasyonu ayrıca doğrulanır
 *   2. Her okuma projenin DONDURULMUŞ `regionPackageVersionId`'si üzerinden yapılır
 *
 * Bir test, `src/` içinde bu modül dışında doğrudan kural tablosu erişimi
 * olmadığını doğrular.
 *
 * KURAL YOKSA `null` + UYARI döner — ASLA koda gömülü varsayılan (ilke 1).
 * Bu sözleşme `SpaceShapeFactorRule` şema yorumunda zaten yazılıydı; burada
 * uygulanıyor.
 *
 * FORMÜL: metin formülleri (`ParkingRule.requirementFormula`,
 * `RequiredSpaceRule.areaFormula`) burada AYRIŞTIRILMAZ — yayım kapısında
 * (`publishVersion`) zaten doğrulanmışlardır. Okuyucu ham metni verir,
 * değerlendirme `@/lib/formula` işidir.
 */

export interface RuleReader {
  /** Projenin dondurduğu sürüm. Proje bağlı değilse null. */
  readonly versionId: string | null;
  /** Okuma sırasında biriken uyarılar. */
  readonly warnings: readonly Warning[];

  zoningRuleSet(): Promise<ZoningRuleSet | null>;
  specialConstraints(): Promise<SpecialConstraintCatalog[]>;
  heightReferences(): Promise<HeightReferenceCatalog[]>;
  consentRule(): Promise<StakeholderConsentRule | null>;

  // --- İP-3 ---
  parkingRule(): Promise<ParkingRule | null>;
  coreRule(): Promise<CoreRule | null>;
  fireSafetyRule(): Promise<FireSafetyRule | null>;
  utilityCoefficients(): Promise<UtilityCoefficientSet | null>;
  requiredSpaceRules(): Promise<RequiredSpaceRule[]>;
  spaceShapeFactors(): Promise<SpaceShapeFactorRule[]>;
  spaceTypeCategories(): Promise<SpaceTypeCategoryMap[]>;
}

class FrozenRuleReader implements RuleReader {
  private readonly collector = new WarningCollector();

  constructor(
    readonly versionId: string | null,
    private readonly client: PrismaClient,
  ) {
    if (versionId === null) this.collector.addOnce("PACKAGE_NOT_BOUND");
  }

  get warnings(): readonly Warning[] {
    return this.collector.all;
  }

  async zoningRuleSet(): Promise<ZoningRuleSet | null> {
    if (!this.versionId) return null;
    const rows = await this.client.zoningRuleSet.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: { ruleKey: "asc" },
    });

    if (rows.length === 1) return rows[0]!;

    // 0 satır: paket henüz doldurulmamış (pilot paket Faz 0 işi).
    // >1 satır: birden çok kural setinden hangisinin seçileceğini DOKÜMAN
    // TANIMLAMIYOR. Birini seçmek uydurma olurdu — uyarıp null dönüyoruz.
    this.collector.addOnce("ZONING_RULE_SET_MISSING", { count: rows.length });
    return null;
  }

  async specialConstraints(): Promise<SpecialConstraintCatalog[]> {
    if (!this.versionId) return [];
    const rows = await this.client.specialConstraintCatalog.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: [{ sortOrder: "asc" }, { ruleKey: "asc" }],
    });
    if (rows.length === 0) this.collector.addOnce("CONSTRAINT_CATALOG_EMPTY");
    return rows;
  }

  async heightReferences(): Promise<HeightReferenceCatalog[]> {
    if (!this.versionId) return [];
    return this.client.heightReferenceCatalog.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: [{ sortOrder: "asc" }, { ruleKey: "asc" }],
    });
  }

  async consentRule(): Promise<StakeholderConsentRule | null> {
    if (!this.versionId) return null;
    const rows = await this.client.stakeholderConsentRule.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: { ruleKey: "asc" },
    });
    if (rows.length === 1) return rows[0]!;
    this.collector.addOnce("CONSENT_RULE_MISSING", { count: rows.length });
    return null;
  }

  // ------------------------------------------------------------------ İP-3

  /**
   * Tekil kural okuma deseni.
   *
   * 0 satır: paket doldurulmamış. >1 satır: hangisinin seçileceğini doküman
   * TANIMLAMIYOR; birini seçmek uydurma olurdu. İkisinde de uyarı + null.
   */
  private async single<T>(
    read: () => Promise<T[]>,
    code: Parameters<WarningCollector["addOnce"]>[0],
  ): Promise<T | null> {
    if (!this.versionId) return null;
    const rows = await read();
    if (rows.length === 1) return rows[0]!;
    this.collector.addOnce(code, { count: rows.length });
    return null;
  }

  async parkingRule(): Promise<ParkingRule | null> {
    return this.single(
      () =>
        this.client.parkingRule.findMany({
          where: { regionPackageVersionId: this.versionId! },
          orderBy: { ruleKey: "asc" },
        }),
      "PARKING_RULE_MISSING",
    );
  }

  async coreRule(): Promise<CoreRule | null> {
    return this.single(
      () =>
        this.client.coreRule.findMany({
          where: { regionPackageVersionId: this.versionId! },
          orderBy: { ruleKey: "asc" },
        }),
      "CORE_RULE_MISSING",
    );
  }

  async fireSafetyRule(): Promise<FireSafetyRule | null> {
    return this.single(
      () =>
        this.client.fireSafetyRule.findMany({
          where: { regionPackageVersionId: this.versionId! },
          orderBy: { ruleKey: "asc" },
        }),
      "FIRE_SAFETY_RULE_MISSING",
    );
  }

  async utilityCoefficients(): Promise<UtilityCoefficientSet | null> {
    return this.single(
      () =>
        this.client.utilityCoefficientSet.findMany({
          where: { regionPackageVersionId: this.versionId! },
          orderBy: { ruleKey: "asc" },
        }),
      "UTILITY_COEFFICIENTS_MISSING",
    );
  }

  async requiredSpaceRules(): Promise<RequiredSpaceRule[]> {
    if (!this.versionId) return [];
    const rows = await this.client.requiredSpaceRule.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: [{ serviceSpaceType: "asc" }, { ruleKey: "asc" }],
    });
    if (rows.length === 0) this.collector.addOnce("REQUIRED_SPACE_RULES_EMPTY");
    return rows;
  }

  async spaceShapeFactors(): Promise<SpaceShapeFactorRule[]> {
    if (!this.versionId) return [];
    return this.client.spaceShapeFactorRule.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: { spaceType: "asc" },
    });
  }

  async spaceTypeCategories(): Promise<SpaceTypeCategoryMap[]> {
    if (!this.versionId) return [];
    return this.client.spaceTypeCategoryMap.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: { spaceType: "asc" },
    });
  }
}

/**
 * Proje için bir kural okuyucu açar.
 *
 * Proje org-filtreli okunur; bulunamazsa hata FIRLATILIR (kiracı sızıntısı
 * bir uyarı değil, hatadır). Proje henüz pakete bağlı değilse okuyucu yine
 * döner ama her okuma null verir ve `PACKAGE_NOT_BOUND` uyarısı taşır —
 * ilke 7: engelleme, uyar.
 */
export async function createRuleReader(
  projectId: string,
  client: PrismaClient = prisma,
): Promise<RuleReader> {
  // Kiracı kapsamı ENJEKTE EDİLEN istemcinin üzerine kurulur; testler kendi
  // veritabanlarını verirken de org filtresi çalışmaya devam eder.
  const scoped = scopedPrisma(client, currentOrganizationId());
  const project = await scoped.project.findUnique({
    where: { id: projectId },
    select: { id: true, regionPackageVersionId: true },
  });

  if (!project) {
    throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  }

  return new FrozenRuleReader(project.regionPackageVersionId, client);
}

/**
 * Bir sürüm için doğrudan okuyucu — YALNIZCA paket yönetimi ve testler için.
 * Uygulama akışı `createRuleReader(projectId)` kullanır; sürümü elle vermek
 * dondurma güvencesini atlar.
 */
export function ruleReaderForVersion(
  versionId: string | null,
  client: PrismaClient = prisma,
): RuleReader {
  return new FrozenRuleReader(versionId, client);
}
