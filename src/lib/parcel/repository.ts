import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * A1–A4 REPOSITORY — parsel, imar, zemin/saha, hak sahipleri.
 *
 * KİRACILIK: her yazma KÖKTEN başlar. `Parcel` ve altındakiler
 * `organizationId` taşımaz; kiracı filtresi ancak `Project` üzerinden
 * uygulanabilir. Bu yüzden önce proje org-filtreli okunur, sonra alt
 * varlıklar o projenin id'siyle yazılır.
 *
 * YARIM KAYIT SERBESTTİR: A1–A4'ün tüm alanları nullable. Eksik alan
 * kaydı engellemez, uyarı üretir (ilke 7). Bu yüzden hepsi `Partial`.
 */

type Client = PrismaClient;

const scoped = (client: Client) => scopedPrisma(client, currentOrganizationId());

/** Projenin var olduğunu doğrular ve id'sini döndürür (kiracı kapsamında). */
async function assertProject(projectId: string, client: Client): Promise<string> {
  const project = await scoped(client).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  return project.id;
}

/**
 * Parseli garanti eder ve id'sini döndürür.
 *
 * `createProject` parsel oluşturmuyor (İP-1); A1 ekranı ilk kaydında oluşturur.
 */
export async function ensureParcel(
  projectId: string,
  client: Client = prisma,
): Promise<string> {
  await assertProject(projectId, client);
  const existing = await client.parcel.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await client.parcel.create({ data: { projectId }, select: { id: true } });
  return created.id;
}

// ------------------------------------------------------------------ A1 parsel

export type ParcelInput = Partial<
  Omit<Prisma.ParcelUncheckedUpdateInput, "id" | "projectId" | "createdAt" | "updatedAt">
>;

export async function saveParcel(
  projectId: string,
  input: ParcelInput,
  client: Client = prisma,
) {
  const parcelId = await ensureParcel(projectId, client);
  return client.parcel.update({ where: { id: parcelId }, data: input });
}

// ------------------------------------------------------------------- A2 imar

/**
 * `ZoningData`'nın hesaplanan alanları GENERATED'dır ve yazılamaz.
 * Tip onları dışlar; Postgres de reddeder — çift koruma.
 */
export type ZoningInput = Partial<
  Omit<
    Prisma.ZoningDataUncheckedUpdateInput,
    | "id"
    | "parcelId"
    | "createdAt"
    | "updatedAt"
    | "maxFootprint"
    | "maxTotalFloorArea"
    | "buildableEnvelope"
    | "basementGainFromLevelDifference"
  >
>;

export async function saveZoningData(
  projectId: string,
  input: ZoningInput,
  client: Client = prisma,
) {
  const parcelId = await ensureParcel(projectId, client);
  return client.zoningData.upsert({
    where: { parcelId },
    // parcelId SPREAD'DEN SONRA: girdi parcelId içerse bile yazma
    // doğrulanmış parsele gider, başka bir parsele YÖNLENDİRİLEMEZ.
    create: { ...(input as Prisma.ZoningDataUncheckedCreateInput), parcelId },
    update: input,
  });
}

// -------------------------------------------------------------- A3 zemin/saha

export type SoilInput = Partial<
  Omit<Prisma.SoilDataUncheckedUpdateInput, "id" | "parcelId" | "createdAt" | "updatedAt">
>;

export async function saveSoilData(
  projectId: string,
  input: SoilInput,
  client: Client = prisma,
) {
  const parcelId = await ensureParcel(projectId, client);
  return client.soilData.upsert({
    where: { parcelId },
    // parcelId SPREAD'DEN SONRA: girdi parcelId içerse bile yazma
    // doğrulanmış parsele gider, başka bir parsele YÖNLENDİRİLEMEZ.
    create: { ...(input as Prisma.SoilDataUncheckedCreateInput), parcelId },
    update: input,
  });
}

export type SiteInput = Partial<
  Omit<Prisma.SiteDataUncheckedUpdateInput, "id" | "parcelId" | "createdAt" | "updatedAt">
>;

export async function saveSiteData(
  projectId: string,
  input: SiteInput,
  client: Client = prisma,
) {
  const parcelId = await ensureParcel(projectId, client);
  return client.siteData.upsert({
    where: { parcelId },
    // parcelId SPREAD'DEN SONRA: girdi parcelId içerse bile yazma
    // doğrulanmış parsele gider, başka bir parsele YÖNLENDİRİLEMEZ.
    create: { ...(input as Prisma.SiteDataUncheckedCreateInput), parcelId },
    update: input,
  });
}

// ------------------------------------------------------------ A4 hak sahipleri

export type StakeholderInput = Partial<
  Omit<Prisma.StakeholderUncheckedCreateInput, "id" | "projectId" | "createdAt" | "updatedAt">
> & { name: string };

export async function addStakeholder(
  projectId: string,
  input: StakeholderInput,
  client: Client = prisma,
) {
  await assertProject(projectId, client);
  return client.stakeholder.create({ data: { ...input, projectId } });
}

export async function updateStakeholder(
  projectId: string,
  stakeholderId: string,
  input: Partial<StakeholderInput>,
  client: Client = prisma,
) {
  await assertProject(projectId, client);
  // projectId koşulu KRİTİK: başka bir projenin hak sahibi güncellenemez.
  const result = await client.stakeholder.updateMany({
    where: { id: stakeholderId, projectId },
    data: input,
  });
  if (result.count === 0) {
    throw new Error(`DATUM_NOT_FOUND: hak sahibi bulunamadı: ${stakeholderId}`);
  }
}

export async function deleteStakeholder(
  projectId: string,
  stakeholderId: string,
  client: Client = prisma,
) {
  await assertProject(projectId, client);
  const result = await client.stakeholder.deleteMany({
    where: { id: stakeholderId, projectId },
  });
  if (result.count === 0) {
    throw new Error(`DATUM_NOT_FOUND: hak sahibi bulunamadı: ${stakeholderId}`);
  }
}

// ------------------------------------------------------------- çoğunluk göstergesi

export interface MajorityIndicator {
  /** Pay oranları toplamı (0–1). */
  readonly totalShare: number;
  /** `agreementStance = olumlu` olanların pay toplamı. */
  readonly agreedShare: number;
  /** Paketten gelen eşik; yoksa null. */
  readonly threshold: number | null;
  /** Eşiğe uzaklık (negatifse aşılmış). null = eşik bilinmiyor. */
  readonly distanceToThreshold: number | null;
  readonly reached: boolean | null;
  readonly stakeholderCount: number;
  readonly warnings: readonly Warning[];
}

/**
 * A4 çoğunluk göstergesi.
 *
 * SAKLANMAZ, OKURKEN HESAPLANIR. Payların saf toplamıdır ve her okumada
 * güncel olur; kalıcılaştırmak bayatlama riski yaratırdı. Eşik dondurulmuş
 * paket sürümünden gelir, dolayısıyla sonuç ilke 2 açısından da kararlıdır.
 *
 * (Karar kaydı: doküman bunu "hesaplanan" sayıyor ama hesaplanan alan üçlüsü
 * açılmadı. Rapor İP-9'da kalıcılık isterse geri dönülür.)
 */
export async function computeMajority(
  projectId: string,
  client: Client = prisma,
): Promise<MajorityIndicator> {
  const w = new WarningCollector();

  const project = await scoped(client).project.findUnique({
    where: { id: projectId },
    include: { stakeholders: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const reader = await createRuleReader(projectId, client);
  const rule = await reader.consentRule();
  w.merge(reader.warnings);

  const shares = project.stakeholders.map((s) => (s.shareRatio ? Number(s.shareRatio) : 0));
  const totalShare = shares.reduce((a, b) => a + b, 0);
  const agreedShare = project.stakeholders
    .filter((s) => s.agreementStance === "olumlu")
    .reduce((sum, s) => sum + (s.shareRatio ? Number(s.shareRatio) : 0), 0);

  // Paylar %100 etmiyorsa UYARIR ama engellemez (ilke 7): eksik pay girişi
  // etüdün erken aşamasında normaldir.
  if (project.stakeholders.length > 0 && Math.abs(totalShare - 1) > 1e-6) {
    w.add("SHARES_DO_NOT_SUM", { total: round(totalShare * 100, 2) });
  }

  const threshold = rule ? Number(rule.majorityThreshold) : null;
  const reached = threshold === null ? null : agreedShare >= threshold;
  const distanceToThreshold = threshold === null ? null : round(threshold - agreedShare, 6);

  if (reached === false) {
    w.add("MAJORITY_NOT_REACHED", {
      agreed: round(agreedShare * 100, 2),
      threshold: round(threshold! * 100, 2),
    });
  }

  return {
    totalShare,
    agreedShare,
    threshold,
    distanceToThreshold,
    reached,
    stakeholderCount: project.stakeholders.length,
    warnings: w.all,
  };
}

// ------------------------------------------------------------------- okuma

/** Sihirbazın ihtiyaç duyduğu her şey, tek sorguda ve kiracı kapsamında. */
export async function loadWizardData(projectId: string, client: Client = prisma) {
  const project = await scoped(client).project.findUnique({
    where: { id: projectId },
    include: {
      parcel: { include: { zoningData: true, soilData: true, siteData: true } },
      stakeholders: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  return project;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
