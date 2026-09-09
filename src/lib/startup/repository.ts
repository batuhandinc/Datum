import { $Enums, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { ensureDefaultBlock } from "@/lib/program/repository";

/**
 * A5 YAZMA KATMANI — sihirbaz cevapları ve otopark kararı.
 *
 * Sunucu eylemleri ham `prisma` KULLANMAZ; buradan geçerler. Sebep:
 * `prisma.parkingLayout.findUnique({ where: { projectId } })` projenin bu
 * organizasyona ait olduğunu DOĞRULAMAZ — kiracı sızdırır. Alt varlıklar
 * `organizationId` taşımadığı için doğrulama daima kökten yapılmalıdır.
 * Bir mimari test bunu zorluyor.
 */

type Client = PrismaClient;

async function assertProject(projectId: string, client: Client): Promise<void> {
  const project = await scopedPrisma(client, currentOrganizationId()).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
}

/** Projenin otopark düzeni — kiracı doğrulamasından sonra. */
export async function readParkingLayout(projectId: string, client: Client = prisma) {
  await assertProject(projectId, client);
  return client.parkingLayout.findUnique({ where: { projectId } });
}

export interface StartupAnswersInput {
  readonly targetParkingCount: number | null;
  readonly elevatorCount: number | null;
  readonly hasCommercialGroundFloor: boolean;
  readonly roofType: string | null;
  readonly specificationLevel: string | null;
}

/**
 * Sihirbaz cevaplarını yazar.
 *
 * ÖN-DOLDURULAN İLE DEĞİŞTİRİLEN AYRIMI: kullanıcının yazdığı değer
 * `*OverrideValue`'ya gider; paketin önerdiği `*ComputedValue`'da kalır.
 * İkisi de görünür kalır ve rapor hangisinin kimden geldiğini söyler (ilke 5).
 *
 * SAKLANMAYAN ÜÇ CEVAP: ısıtma sistemi ve yedek güç kapsamı bir `ServiceSpace`
 * satırı gerektiriyor ve o satır servis mekanı ONAYINDA doğuyor; "bağımsız
 * bölüm depoları"nın ise veri modelinde hedef alanı YOK (v1.3 açık kararı).
 * Uydurma alan açmaktansa kaydetmiyoruz.
 */
export async function saveStartupAnswers(
  projectId: string,
  input: StartupAnswersInput,
  client: Client = prisma,
): Promise<void> {
  await assertProject(projectId, client);
  const blockId = await ensureDefaultBlock(projectId, client);

  if (input.targetParkingCount !== null) {
    await client.parkingLayout.upsert({
      where: { projectId },
      create: { projectId, targetCountOverrideValue: input.targetParkingCount },
      update: { targetCountOverrideValue: input.targetParkingCount },
    });
  }

  if (input.elevatorCount !== null) {
    const core = await client.core.findUnique({ where: { blockId }, select: { id: true } });
    if (core) {
      const existing = await client.elevator.findFirst({ where: { coreId: core.id } });
      if (existing) {
        await client.elevator.update({
          where: { id: existing.id },
          data: { countOverrideValue: input.elevatorCount },
        });
      } else {
        await client.elevator.create({
          data: { coreId: core.id, countOverrideValue: input.elevatorCount },
        });
      }
    }
  }

  await client.floor.updateMany({
    where: { blockId, floorType: "zemin" },
    data: { hasCommercial: input.hasCommercialGroundFloor },
  });

  if (input.roofType !== null) {
    const roofType = input.roofType as $Enums.RoofType;
    await client.roof.upsert({
      where: { blockId },
      create: { blockId, roofType },
      update: { roofType },
    });
  }

  if (input.specificationLevel !== null) {
    const selectedLevel = input.specificationLevel as $Enums.SpecificationLevel;
    const existing = await client.specificationSet.findFirst({ where: { projectId } });
    if (existing) {
      await client.specificationSet.update({ where: { id: existing.id }, data: { selectedLevel } });
    } else {
      await client.specificationSet.create({ data: { projectId, selectedLevel } });
    }
  }
}

/**
 * Rampa genişliğini yazar ve boy/ayak izini hesaplayıp saklar.
 *
 * `Ramp` `ParkingLayout`'un çocuğudur; layout yoksa açılır. Bu bir KARAR
 * değildir — layout yalnızca kaptır, karar `basementFloorCountOverrideValue`
 * yazılınca doğar.
 *
 * `length` ve `footprintArea` GENERATED kolonlardır; `*ComputedValue`'ya yazılır.
 */
export async function saveRamp(
  projectId: string,
  width: number | null,
  computed: { length: number | null; footprintArea: number | null },
  client: Client = prisma,
): Promise<void> {
  await assertProject(projectId, client);

  const layout = await client.parkingLayout.upsert({
    where: { projectId },
    create: { projectId },
    update: {},
    select: { id: true },
  });

  const existing = await client.ramp.findFirst({ where: { parkingLayoutId: layout.id } });
  const data = {
    width,
    lengthComputedValue: computed.length,
    footprintAreaComputedValue: computed.footprintArea,
  };

  if (existing) {
    await client.ramp.update({ where: { id: existing.id }, data });
  } else {
    await client.ramp.create({ data: { parkingLayoutId: layout.id, ...data } });
  }
}

/** Projenin rampası — kiracı doğrulamasından sonra. */
export async function readRamp(projectId: string, client: Client = prisma) {
  await assertProject(projectId, client);
  const layout = await client.parkingLayout.findUnique({
    where: { projectId },
    select: { id: true },
  });
  if (!layout) return null;
  return client.ramp.findFirst({ where: { parkingLayoutId: layout.id } });
}

export interface ParkingChoice {
  readonly basementFloorCount: number;
  readonly plannedCount: number | null;
  readonly requiredCount: number | null;
  readonly deficitCount: number;
  readonly reason: string | null;
}

/**
 * Seçilen otopark senaryosunu KALICI hâle getirir.
 *
 * Senaryolar saklanmaz; kalıcı olan yalnızca KARAR. Eksikli bir senaryo
 * seçilirse seçim anındaki eksik `acceptedDeficitCount`'a yazılır —
 * "2 park eksik olduğu bilinerek 1 bodrum seçildi" bir RİSK KABULÜDÜR ve
 * İP-9 raporunda görünmelidir. `deficitCount` sonradan program değişince
 * kayar; kabul edilen sayı kaymaz.
 */
export async function chooseParkingScenario(
  projectId: string,
  choice: ParkingChoice,
  client: Client = prisma,
): Promise<void> {
  await assertProject(projectId, client);

  const data = {
    basementFloorCountOverrideValue: choice.basementFloorCount,
    basementFloorCountOverrideReason: choice.reason,
    plannedCountComputedValue: choice.plannedCount,
    requiredCountComputedValue: choice.requiredCount,
    deficitCountComputedValue: choice.deficitCount,
    acceptedDeficitCount: choice.deficitCount > 0 ? choice.deficitCount : null,
  };

  await client.parkingLayout.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });
}
