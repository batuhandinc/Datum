import { createHash } from "node:crypto";
import type { Prisma, PrismaClient, Project, RegionPackageVersion } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { FORMULA_SLOTS, validateFormula, type FormulaSlot } from "@/lib/formula";

/**
 * BÖLGE PAKETİ SÜRÜM DONDURMA — İP-1 teslimatı 4.
 *
 * etut-veri-modeli.md §1.2 (:26-30):
 *   "Proje, bağlandığı bölge paketinin SÜRÜMÜNÜ DONDURUR. Yönetmelik değişince
 *    eski projelerin hesabı geriye dönük değişmemeli. Teklif verdiğin bir proje
 *    altı ay sonra farklı rakam göstermemeli.
 *    Uygulama: Project.regionPackageVersionId tutulur. Kullanıcı isterse
 *    'yeni sürüme geçir' der, sistem farkları gösterir."
 *
 * ASIL KORUMA VERİTABANINDADIR (prisma/sql/immutability.sql). Buradaki kod
 * anlaşılır hata mesajı ve iş akışı sağlar; $executeRaw ile dolanılsa bile
 * trigger'lar aynı kuralı uygular.
 */

/** Sürüme bağlı TÜM kural tabloları. Yeni tablo eklenirse buraya da eklenir. */
export const VERSION_SCOPED_MODELS = [
  "zoningRuleSet",
  "requiredSpaceRule",
  "parkingRule",
  "coreRule",
  "fireSafetyRule",
  "costItemCatalog",
  "costCategoryTree",
  "projectExpenseTemplate",
  "specificationPackage",
  "processTemplate",
  "incentiveProgram",
  "structuralCoefficientSet",
  "taxAndIndexRule",
  "objectCostMapping",
  "spaceShapeFactorRule",
  "utilityCoefficientSet",
  "specialConstraintCatalog",
  "facadeMaterialCatalog",
  "spaceTypeCategoryMap",
  "parametricLumpSumRule",
  "heightReferenceCatalog",
  "stakeholderConsentRule",
] as const;

export type VersionScopedModel = (typeof VERSION_SCOPED_MODELS)[number];

/** Hash'e girmeyen altyapı alanları — kozmetik değişiklik fark üretmemeli. */
const NON_SEMANTIC = new Set(["id", "rowHash", "regionPackageVersionId", "createdAt", "updatedAt"]);

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([k]) => !NON_SEMANTIC.has(k))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(",")}}`;
}

export function semanticRowHash(row: object): string {
  return createHash("sha256").update(stableStringify(row)).digest("hex").slice(0, 32);
}

/**
 * Bir kural satırındaki formülü sözleşmesine karşı doğrular; geçersizse fırlatır.
 *
 * Hata metni TANIMLAYICI taşır, Türkçe cümle değil (konvansiyon): hangi tablo,
 * hangi ruleKey, hangi kolon, hangi hata kodu, kaçıncı karakter.
 */
function assertValidFormula(slot: FormulaSlot, row: Record<string, unknown>): void {
  const raw = row[slot.field];
  const where = `${slot.model}.${String(row.ruleKey)}.${slot.field}`;

  if (raw === null || raw === undefined || String(raw).trim() === "") {
    if (slot.optional) return;
    throw new Error(`DATUM_INVALID_FORMULA: ${where} — EMPTY`);
  }

  if (typeof raw !== "string") {
    throw new Error(`DATUM_INVALID_FORMULA: ${where} — NOT_A_STRING`);
  }

  const result = validateFormula(raw, slot.contract);
  if (result.ok) return;

  const { code, at, token } = result.error;
  throw new Error(
    `DATUM_INVALID_FORMULA: ${where} — ${code}@${at}${token ? ` (${token})` : ""}`,
  );
}

/**
 * Bir draft sürümü YAYIMLAR.
 *
 * Tek transaction içinde:
 *   1. her kural satırının anlamsal rowHash'i yazılır (henüz DRAFT'ken — yayımdan
 *      sonra yazılamazdı, çünkü trigger değişikliği reddeder)
 *   2. tablo bazlı tableHashes hesaplanır (fark ekranında kısa devre için)
 *   3. status EN SON `published`'a çevrilir
 *
 * Sıra önemlidir: status önce çevrilseydi, hash yazımı kendi trigger'ına takılırdı.
 */
export async function publishVersion(
  versionId: string,
  /** Test ve fixture için enjekte edilebilir — diğer modüllerdeki desenin aynısı. */
  client: PrismaClient = prisma,
): Promise<RegionPackageVersion> {
  return client.$transaction(async (tx) => {
    const version = await tx.regionPackageVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error(`DATUM_NOT_FOUND: sürüm bulunamadı: ${versionId}`);
    if (version.status !== "draft") {
      throw new Error(
        `DATUM_ALREADY_PUBLISHED: yalnızca draft bir sürüm yayımlanabilir; bu sürüm "${version.status}".`,
      );
    }

    const tableHashes: Record<string, string> = {};

    for (const model of VERSION_SCOPED_MODELS) {
      const delegate = tx[model] as unknown as {
        findMany: (a: object) => Promise<Array<Record<string, unknown>>>;
        update: (a: object) => Promise<unknown>;
      };

      const rows = await delegate.findMany({
        where: { regionPackageVersionId: versionId },
        orderBy: { ruleKey: "asc" },
      });

      // FORMÜL KAPISI: bozuk bir formül YAYIMI REDDEDER.
      //
      // Doğrulama okuma anında değil BURADA yapılır. Okuma anında yapılsaydı
      // bozuk formül ancak birisi o projeyi açtığında fark edilirdi — ve o an
      // paket zaten dondurulmuş, düzeltmek için yeni sürüm gerekiyor olurdu.
      // Burada yakalanınca sürüm `draft` kalır ve paket sahibi düzeltir.
      for (const slot of FORMULA_SLOTS) {
        if (slot.model !== model) continue;
        for (const row of rows) {
          assertValidFormula(slot, row);
        }
      }

      const hashes: string[] = [];
      for (const row of rows) {
        const hash = semanticRowHash(row);
        hashes.push(`${String(row.ruleKey)}:${hash}`);
        await delegate.update({ where: { id: row.id as string }, data: { rowHash: hash } });
      }

      tableHashes[model] = createHash("sha256").update(hashes.join("|")).digest("hex").slice(0, 32);
    }

    return tx.regionPackageVersion.update({
      where: { id: versionId },
      data: {
        tableHashes: tableHashes as Prisma.InputJsonValue,
        status: "published",
        publishedAt: new Date(),
      },
    });
  });
}

/**
 * Projeyi bir bölge paketi sürümüne BAĞLAR ve sürümü DONDURUR.
 *
 * Bu, İP-1'in "bitti sayılır" ölçütünün üçüncü adımıdır (mvp-spesifikasyonu.md:47).
 *
 * Bağlama anında paket varsayılanları `computedValue` kolonlarına MATERYALİZE
 * edilir — böylece teslimat 4 (dondurma) ile teslimat 5 (hesaplanan değer)
 * tek mekanizmaya iner: paketten gelen bir değer de ezilebilir bir hesaplanan
 * değerdir (`Project.currency`, :112 "paketten gelir, ezilebilir").
 */
export async function bindProjectToPackageVersion(
  projectId: string,
  versionId: string,
): Promise<Project> {
  const organizationId = currentOrganizationId();

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

    if (project.regionPackageVersionId) {
      throw new Error(
        "DATUM_SET_ONCE: bu proje zaten bir sürüme bağlı. Sürüm değiştirmek için " +
          "`applied` bir ProjectPackageMigration kaydı gerekir (etut-veri-modeli.md:30).",
      );
    }

    const version = await tx.regionPackageVersion.findUnique({
      where: { id: versionId },
      include: { regionPackage: true },
    });
    if (!version) throw new Error(`DATUM_NOT_FOUND: sürüm bulunamadı: ${versionId}`);
    if (version.regionPackage.organizationId !== organizationId) {
      throw new Error("DATUM_TENANT_SCOPE: sürüm bu organizasyona ait değil.");
    }
    if (version.status !== "published") {
      throw new Error(
        `DATUM_NOT_PUBLISHED: proje yalnızca yayımlanmış bir sürüme bağlanabilir; ` +
          `bu sürüm "${version.status}".`,
      );
    }

    return tx.project.update({
      where: { id: projectId },
      data: {
        regionPackageVersionId: versionId,
        // Paket varsayılanının materyalizasyonu. `currency` GENERATED olduğu için
        // ASLA doğrudan yazılmaz — computedValue yazılır, generated kolon türetir.
        currencyComputedValue: await resolvePackageCurrency(tx, versionId),
      },
    });
  });
}

/**
 * Paketin para birimi varsayılanı.
 *
 * İP-1'de kural içeriği HENÜZ YOK (pilot bölge paketi Faz 0 işi,
 * mvp-spesifikasyonu.md:163), bu yüzden TaxAndIndexRule'dan okunur ve
 * yoksa null döner. KODA GÖMÜLÜ BİR VARSAYILAN YOKTUR — "TRY" yazmak
 * ilke 1'i ihlal ederdi (para birimi yerel bir kuraldır).
 */
async function resolvePackageCurrency(
  tx: Prisma.TransactionClient | PrismaClient,
  versionId: string,
): Promise<string | null> {
  const rule = await tx.taxAndIndexRule.findFirst({
    where: { regionPackageVersionId: versionId, ruleKey: "currency" },
  });
  if (!rule) return null;
  const series = rule.indexSeries as { currency?: unknown } | null;
  return typeof series?.currency === "string" ? series.currency : null;
}
