import type { Prisma, Project, ProjectStatus, ProjectType, Tier } from "@prisma/client";
import { db } from "@/lib/db/tenant";
import {
  findGeneratedColumnViolations,
  stripGeneratedColumns,
} from "@/lib/computed/generated";

/**
 * Proje CRUD — İP-1 teslimatı 3.
 *
 * YAZILAMAZ KOLON KORUMASI: Project.currency bir GENERATED kolondur
 * (COALESCE(currencyOverrideValue, currencyComputedValue)). Postgres ona
 * yazmayı zaten reddeder; buradaki tipler o hatayı ÇALIŞMA ZAMANINDAN
 * DERLEME ZAMANINA taşır.
 */

/** Proje oluştururken yazılabilir alanlar. `currency` KASITEN yok. */
export interface CreateProjectInput {
  /** @src etut-veri-modeli.md:107 */
  name: string;
  /** @src etut-veri-modeli.md:108 */
  projectType: ProjectType;
  /**
   * @src etut-veri-modeli.md:110
   * Zorunlu ve varsayılansız: süreç modeli :351 sihirbazın ilk ekranında
   * kademeyi açıkça sorduruyor ("ad, tip, kademe seçimi").
   */
  tier: Tier;
  /** @src etut-veri-modeli.md:109 — verilmezse `taslak` */
  status?: ProjectStatus;
  /** @src etut-veri-modeli.md:113 */
  priceReferenceDate?: Date | null;
  /** @src etut-veri-modeli.md:114 */
  notes?: string | null;
}

/**
 * Güncellenebilir alanlar.
 * `regionPackageVersionId` BURADA YOK — sürüm bağlama ayrı ve korumalı bir
 * işlemdir (bkz. lib/region-package/bind.ts). Set-once kuralı veritabanı
 * trigger'ıyla da zorlanır.
 */
export type UpdateProjectInput = Partial<
  Pick<CreateProjectInput, "name" | "projectType" | "tier" | "status" | "priceReferenceDate" | "notes">
>;

export interface ListProjectsOptions {
  tier?: Tier;
  status?: ProjectStatus;
  skip?: number;
  take?: number;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  assertNoGeneratedColumns(input);
  return db().project.create({
    data: {
      name: input.name,
      projectType: input.projectType,
      tier: input.tier,
      ...(input.status !== undefined ? { status: input.status } : {}),
      priceReferenceDate: input.priceReferenceDate ?? null,
      notes: input.notes ?? null,
    } as Prisma.ProjectUncheckedCreateInput,
  });
}

export async function getProject(id: string): Promise<Project | null> {
  return db().project.findUnique({ where: { id } });
}

export async function listProjects(options: ListProjectsOptions = {}): Promise<Project[]> {
  const { tier, status, skip, take } = options;
  return db().project.findMany({
    where: {
      ...(tier ? { tier } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    ...(skip !== undefined ? { skip } : {}),
    ...(take !== undefined ? { take } : {}),
  });
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  assertNoGeneratedColumns(input);
  return db().project.update({
    where: { id },
    data: stripGeneratedColumns("Project", input) as Prisma.ProjectUncheckedUpdateInput,
  });
}

export async function deleteProject(id: string): Promise<Project> {
  return db().project.delete({ where: { id } });
}

export async function countProjects(options: Pick<ListProjectsOptions, "tier" | "status"> = {}) {
  const { tier, status } = options;
  return db().project.count({
    where: {
      ...(tier ? { tier } : {}),
      ...(status ? { status } : {}),
    },
  });
}

/**
 * Yükte yazılamaz (GENERATED) kolon varsa erken ve anlaşılır biçimde patlar.
 * Postgres de reddederdi, ama hata mesajı çağıran için çok daha az açıklayıcı olurdu.
 */
function assertNoGeneratedColumns(payload: object): void {
  const violations = findGeneratedColumnViolations("Project", payload);
  if (violations.length > 0) {
    throw new Error(
      `DATUM_GENERATED_COLUMN: ${violations.join(", ")} yazılamaz — bu kolon(lar) ` +
        `COALESCE(overrideValue, computedValue) olarak veritabanında üretilir. ` +
        `Bunun yerine <alan>ComputedValue veya <alan>OverrideValue yazın.`,
    );
  }
}
