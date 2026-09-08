import type {
  HeightReferenceCatalog,
  SpecialConstraintCatalog,
  StakeholderConsentRule,
  ZoningRuleSet,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { db } from "@/lib/db/tenant";
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
 * KAPSAM: İP-2 yalnızca TİPLİ OKUMA yapar. Formül dili
 * (`ParkingRule.requirementFormula`, `RequiredSpaceRule.areaFormula`) İP-3'e aittir.
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
}

class FrozenRuleReader implements RuleReader {
  private readonly collector = new WarningCollector();

  constructor(readonly versionId: string | null) {
    if (versionId === null) this.collector.addOnce("PACKAGE_NOT_BOUND");
  }

  get warnings(): readonly Warning[] {
    return this.collector.all;
  }

  async zoningRuleSet(): Promise<ZoningRuleSet | null> {
    if (!this.versionId) return null;
    const rows = await prisma.zoningRuleSet.findMany({
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
    const rows = await prisma.specialConstraintCatalog.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: [{ sortOrder: "asc" }, { ruleKey: "asc" }],
    });
    if (rows.length === 0) this.collector.addOnce("CONSTRAINT_CATALOG_EMPTY");
    return rows;
  }

  async heightReferences(): Promise<HeightReferenceCatalog[]> {
    if (!this.versionId) return [];
    return prisma.heightReferenceCatalog.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: [{ sortOrder: "asc" }, { ruleKey: "asc" }],
    });
  }

  async consentRule(): Promise<StakeholderConsentRule | null> {
    if (!this.versionId) return null;
    const rows = await prisma.stakeholderConsentRule.findMany({
      where: { regionPackageVersionId: this.versionId },
      orderBy: { ruleKey: "asc" },
    });
    if (rows.length === 1) return rows[0]!;
    this.collector.addOnce("CONSENT_RULE_MISSING", { count: rows.length });
    return null;
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
export async function createRuleReader(projectId: string): Promise<RuleReader> {
  const project = await db().project.findUnique({
    where: { id: projectId },
    select: { id: true, regionPackageVersionId: true },
  });

  if (!project) {
    throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  }

  return new FrozenRuleReader(project.regionPackageVersionId);
}

/**
 * Bir sürüm için doğrudan okuyucu — YALNIZCA paket yönetimi ve testler için.
 * Uygulama akışı `createRuleReader(projectId)` kullanır; sürümü elle vermek
 * dondurma güvencesini atlar.
 */
export function ruleReaderForVersion(versionId: string | null): RuleReader {
  return new FrozenRuleReader(versionId);
}
