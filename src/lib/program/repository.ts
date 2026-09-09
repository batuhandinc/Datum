import { $Enums, Prisma, type PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { parseTemplateSpaces, templateTotalArea, type TemplateSpace } from "./schemas";

/**
 * A5 PROGRAM TANIMI — blok, kat, birim, tipoloji.
 *
 * `etut-portali-proje-dokumani.md` §5 katman 4:
 *   "KARAR: bağımsız bölüm karmasını KULLANICI BELİRLER, SİSTEM ÖNERMEZ.
 *    Kullanıcı kat kat girer; sistem programı zarfa yerleştirir."
 *
 * Bu dosya yalnızca yazar ve okur. Hiçbir yerde karma ÖNERİLMEZ.
 *
 * KİRACILIK: her yazma önce `assertProject` ile kökten doğrulanır; alt varlık
 * sorguları kökten yazılır (bkz. `src/lib/db/client.ts`).
 */

type Client = PrismaClient;

const scoped = (client: Client) => scopedPrisma(client, currentOrganizationId());

async function assertProject(projectId: string, client: Client): Promise<string> {
  const project = await scoped(client).project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  return project.id;
}

/**
 * Projenin varsayılan bloğunu (ve çekirdeğini) döndürür, yoksa oluşturur.
 *
 * §5: "Tek bloklu projede otomatik tek blok oluşur, ARAYÜZDE GÖRÜNMEZ."
 * Çekirdek `Block` başına tekildir ve L1'in yazacağı yerdir.
 */
export async function ensureDefaultBlock(
  projectId: string,
  client: Client = prisma,
): Promise<string> {
  await assertProject(projectId, client);

  const existing = await client.block.findFirst({
    where: { projectId },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    select: { id: true },
  });
  if (existing) {
    await client.core.upsert({
      where: { blockId: existing.id },
      create: { blockId: existing.id },
      update: {},
    });
    return existing.id;
  }

  const block = await client.block.create({
    data: { projectId, isDefault: true, core: { create: {} } },
    select: { id: true },
  });
  return block.id;
}

// ------------------------------------------------------------------- katlar

export type FloorInput = Partial<
  Omit<Prisma.FloorUncheckedUpdateInput, "id" | "blockId" | "createdAt" | "updatedAt" | "grossArea">
>;

/** Kat ekler. `floorNo` bodrumda NEGATİFTİR (§5). */
export async function addFloor(
  projectId: string,
  input: FloorInput & { floorNo: number; floorType: $Enums.FloorType },
  client: Client = prisma,
) {
  const blockId = await ensureDefaultBlock(projectId, client);
  // blockId SPREAD'DEN SONRA: girdi blockId içerse bile yazma doğrulanmış
  // bloğa gider, başka bir projenin bloğuna YÖNLENDİRİLEMEZ.
  return client.floor.create({
    data: { ...(input as Prisma.FloorUncheckedCreateInput), blockId },
  });
}

export async function updateFloor(
  projectId: string,
  floorId: string,
  input: FloorInput,
  client: Client = prisma,
) {
  const blockId = await ensureDefaultBlock(projectId, client);
  const result = await client.floor.updateMany({ where: { id: floorId, blockId }, data: input });
  if (result.count === 0) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);
  return client.floor.findUnique({ where: { id: floorId } });
}

export async function deleteFloor(projectId: string, floorId: string, client: Client = prisma) {
  const blockId = await ensureDefaultBlock(projectId, client);
  const result = await client.floor.deleteMany({ where: { id: floorId, blockId } });
  if (result.count === 0) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);
}

/**
 * TİPİK KAT KİLİDİ.
 *
 * `etut-portali-proje-dokumani.md` §5 katman 4:
 *   "Her katın bir kilit göstergesi vardır. Kilitli katlar tipik kat şablonuna
 *    referans verir. KİLİT AÇILAN KAT BAĞIMSIZLAŞIR."
 *
 * Kilit açılınca `templateFloorId` TEMİZLENİR ama katın kendi verisi (birimler,
 * yükseklikler) DOKUNULMADAN kalır — kademe kuralıyla aynı ilke: bağ kopar,
 * veri silinmez.
 *
 * Bir kat kendi kendine şablon olamaz ve şablon zinciri kurulamaz: şablon
 * olarak seçilen kat kilitli OLMAMALIDIR, yoksa "şablonun şablonu" doğar ve
 * hangi katın otorite olduğu belirsizleşir.
 */
export async function setFloorLock(
  projectId: string,
  floorId: string,
  isLocked: boolean,
  templateFloorId: string | null,
  client: Client = prisma,
) {
  const blockId = await ensureDefaultBlock(projectId, client);

  if (!isLocked) {
    return updateFloor(projectId, floorId, { isLocked: false, templateFloorId: null }, client);
  }

  if (!templateFloorId) {
    throw new Error("DATUM_TEMPLATE_REQUIRED: kilitli kat bir şablona referans vermelidir.");
  }
  if (templateFloorId === floorId) {
    throw new Error("DATUM_TEMPLATE_SELF: bir kat kendi şablonu olamaz.");
  }

  const template = await client.floor.findFirst({
    where: { id: templateFloorId, blockId },
    select: { id: true, isLocked: true },
  });
  if (!template) {
    throw new Error(`DATUM_NOT_FOUND: şablon kat bulunamadı: ${templateFloorId}`);
  }
  if (template.isLocked) {
    throw new Error("DATUM_TEMPLATE_CHAIN: şablon olarak kilitli bir kat seçilemez.");
  }

  return updateFloor(projectId, floorId, { isLocked: true, templateFloorId }, client);
}

// --------------------------------------------------------------- tipolojiler

/** Tipoloji şablonu ekler veya günceller. `unitTypeCode` proje içinde tekildir. */
export async function saveUnitType(
  projectId: string,
  unitTypeCode: string,
  spaces: readonly TemplateSpace[],
  client: Client = prisma,
) {
  await assertProject(projectId, client);
  assertKnownSpaceTypes(spaces);

  const existing = await client.unitType.findFirst({
    where: { projectId, unitTypeCode },
    select: { id: true },
  });

  const spaceList = spaces as unknown as Prisma.InputJsonValue;

  if (existing) {
    return client.unitType.update({ where: { id: existing.id }, data: { spaceList } });
  }
  return client.unitType.create({ data: { projectId, unitTypeCode, spaceList } });
}

/** Bilinmeyen mekan tipi sessizce Prisma hatasına dönüşmesin. */
function assertKnownSpaceTypes(spaces: readonly TemplateSpace[]): void {
  const known = new Set<string>(Object.values($Enums.SpaceType));
  for (const s of spaces) {
    if (!known.has(s.spaceType)) {
      throw new Error(`DATUM_UNKNOWN_SPACE_TYPE: ${s.spaceType}`);
    }
  }
}

/**
 * ŞABLONU ÖRNEKLER — bir kata `count` adet birim açar ve mekanlarını kopyalar.
 *
 * §5: "Bu şablon 10 kez örneklenir." Kopyalanan mekanlar örneğin KENDİ
 * verisidir: kullanıcı sonradan bir örneği değiştirirse şablon değişmez ve
 * örnek şablondan AYRIŞIR. Ayrışma `unitTypeCode` üzerinden görünür kalır
 * (`divergedUnits` bunu hesaplar).
 */
export async function instantiateUnitType(
  projectId: string,
  floorId: string,
  unitTypeCode: string,
  count: number,
  client: Client = prisma,
) {
  const blockId = await ensureDefaultBlock(projectId, client);

  const floor = await client.floor.findFirst({
    where: { id: floorId, blockId },
    select: { id: true, floorNo: true, _count: { select: { units: true } } },
  });
  if (!floor) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

  const type = await client.unitType.findFirst({ where: { projectId, unitTypeCode } });
  if (!type) throw new Error(`DATUM_NOT_FOUND: tipoloji bulunamadı: ${unitTypeCode}`);

  const spaces = parseTemplateSpaces(type.spaceList);
  const created: string[] = [];

  for (let i = 0; i < count; i++) {
    const unit = await client.unit.create({
      data: {
        floorId,
        unitNo: `${floor.floorNo}-${floor._count.units + i + 1}`,
        unitTypeCode,
        usageType: "konut",
        spaces: {
          create: spaces.map((s) => ({
            spaceType: s.spaceType as $Enums.SpaceType,
            ...(s.name === undefined ? {} : { name: s.name }),
            area: new Prisma.Decimal(s.area.toFixed(3)),
          })),
        },
      },
      select: { id: true },
    });
    created.push(unit.id);
  }

  return created;
}

export interface UnitDivergence {
  readonly unitId: string;
  readonly unitNo: string | null;
  readonly unitTypeCode: string;
  readonly templateArea: number;
  readonly actualArea: number;
  readonly difference: number;
}

/**
 * ŞABLONDAN AYRIŞAN ÖRNEKLER.
 *
 * Örnek, şablonun toplam hedef alanından saparsa AYRIŞMIŞTIR. Ayrışma bir
 * hata değildir (kullanıcı bilerek değiştirmiş olabilir) — yalnızca GÖRÜNÜR
 * olmalıdır; §5 "örnek şablondan ayrışabilir ve ayrışma işaretlenir".
 *
 * SAKLANMAZ, okurken hesaplanır: şablon veya örnek değişince kendiliğinden
 * güncel olur (çoğunluk göstergesiyle aynı gerekçe).
 */
export async function divergedUnits(
  projectId: string,
  client: Client = prisma,
  tolerance = 0.01,
): Promise<UnitDivergence[]> {
  await assertProject(projectId, client);

  const [types, units] = await Promise.all([
    client.unitType.findMany({ where: { projectId } }),
    scoped(client).project.findUnique({
      where: { id: projectId },
      select: {
        blocks: {
          select: {
            floors: {
              select: {
                units: {
                  select: {
                    id: true,
                    unitNo: true,
                    unitTypeCode: true,
                    spaces: { select: { area: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const templateArea = new Map<string, number>();
  for (const t of types) {
    templateArea.set(t.unitTypeCode, templateTotalArea(parseTemplateSpaces(t.spaceList)));
  }

  const out: UnitDivergence[] = [];
  for (const block of units?.blocks ?? []) {
    for (const floor of block.floors) {
      for (const unit of floor.units) {
        if (!unit.unitTypeCode) continue;
        const expected = templateArea.get(unit.unitTypeCode);
        if (expected === undefined) continue;

        const actual = unit.spaces.reduce((sum, s) => sum + (s.area ? Number(s.area) : 0), 0);
        const difference = round(actual - expected, 3);
        if (Math.abs(difference) > tolerance) {
          out.push({
            unitId: unit.id,
            unitNo: unit.unitNo,
            unitTypeCode: unit.unitTypeCode,
            templateArea: round(expected, 3),
            actualArea: round(actual, 3),
            difference,
          });
        }
      }
    }
  }
  return out;
}

// -------------------------------------------------------------------- okuma

/** A5 ekranının ihtiyacı olan her şey, tek sorguda ve kökten. */
export async function loadProgram(projectId: string, client: Client = prisma) {
  const project = await scoped(client).project.findUnique({
    where: { id: projectId },
    include: {
      blocks: {
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
        include: {
          core: { include: { elevators: true, shafts: true } },
          floors: {
            orderBy: { floorNo: "asc" },
            include: { units: { orderBy: { unitNo: "asc" } } },
          },
        },
      },
      unitTypes: { orderBy: { unitTypeCode: "asc" } },
      // Zarf ve emsal A5 panellerinin girdisi: bodrum kat alanı zarftan,
      // toplam inşaat alanı emsalden gelir.
      parcel: { include: { zoningData: true } },
    },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);
  return project;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
