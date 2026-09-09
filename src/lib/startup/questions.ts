import { evaluateFormula, validateFormula, PARKING_REQUIREMENT } from "@/lib/formula";
import type { PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { createRuleReader } from "@/lib/rules/reader";
import { ensureDefaultBlock } from "@/lib/program/repository";
import { WarningCollector, type Warning } from "@/lib/warnings";

/**
 * PROJE BAŞLANGIÇ SİHİRBAZI — 8 SORU.
 *
 * Kaynak: `etut-portali-proje-dokumani.md` §5'in sonu. (Bu liste
 * `etut-veri-modeli.md`'de YOKTUR — v1.3 bunu kayda geçirdi.)
 *
 *   "Plan üretiminden önce, sonucu köklü etkileyen kararlar sorulur.
 *    KURAL KATMANI CEVAPLARI ÖN-DOLDURUR, kullanıcı onaylar veya değiştirir."
 *
 * ÖN-DOLDURULAN İLE DEĞİŞTİRİLEN AYIRT EDİLEBİLİR KALIR — bu tam olarak
 * hesaplanan/ezme ayrımıdır (ilke 5) ve altyapısı zaten var:
 * ön-dolan `<alan>ComputedValue`, kullanıcının değiştirdiği `<alan>OverrideValue`.
 *
 * BULGU (v1.3'te kayda geçti): 8 sorunun yalnızca İKİSİNİN pakette ön-dolum
 * kaynağı var — hedef otopark sayısı (`ParkingRule.requirementFormula`) ve
 * asansör sayısı (`CoreRule.minElevatorCount`). Kalan altısı için dokümanın
 * "kural katmanı ön-doldurur" ifadesi karşılıksızdır; onlar düz manuel alandır
 * ve üçlü AÇILMAZ.
 */

/** Sorunun cevabının nereden geldiği — arayüz bunu rozet olarak gösterir. */
export type AnswerSource = "prefilled" | "userOverride" | "empty";

export interface StartupAnswer {
  readonly key: StartupQuestionKey;
  /** Gösterilecek değer (ezme varsa o, yoksa ön-dolan). */
  readonly value: string | null;
  /** Paketin önerdiği değer. Ön-dolum kaynağı olmayan sorularda null. */
  readonly prefilled: string | null;
  readonly source: AnswerSource;
  /** Bu sorunun pakette bir ön-dolum kaynağı VAR MI? */
  readonly hasPackageSource: boolean;
}

export const STARTUP_QUESTION_KEYS = [
  "targetParkingCount",
  "heatingSystemType",
  "hasCommercialGroundFloor",
  "hasUnitStorages",
  "elevatorCount",
  "roofType",
  "generatorScope",
  "specificationLevel",
] as const;

export type StartupQuestionKey = (typeof STARTUP_QUESTION_KEYS)[number];

export interface StartupState {
  readonly answers: readonly StartupAnswer[];
  readonly warnings: readonly Warning[];
}

function classify(prefilled: string | null, override: string | null): StartupAnswer["source"] {
  if (override !== null) return "userOverride";
  if (prefilled !== null) return "prefilled";
  return "empty";
}

/**
 * Sihirbazın güncel durumunu okur ve ön-dolumları hesaplar.
 *
 * Ön-dolum SAKLANMAZ burada — yalnızca hesaplanır ve gösterilir. Kalıcı
 * hâle gelmesi `applyPrefill` ile olur (kullanıcı onayladığında).
 */
export async function readStartupState(
  projectId: string,
  client: PrismaClient = prisma,
): Promise<StartupState> {
  const w = new WarningCollector();

  // KİRACILIK KÖKTEN DOĞRULANIR. Aşağıdaki okumalar alt varlıklara
  // (parkingLayout, roof, elevator…) doğrudan gidiyor ve o tablolar
  // `organizationId` TAŞIMIYOR — filtrelenemezler. Bu yüzden önce projenin
  // bu organizasyona ait olduğu doğrulanır; doğrulanmazsa hiçbir alt varlık
  // okunmaz. Dolaylı garanti (ensureDefaultBlock içindeki kontrol) yeterli
  // olurdu ama okurken görünmezdi.
  const scoped = scopedPrisma(client, currentOrganizationId());
  const project = await scoped.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const blockId = await ensureDefaultBlock(projectId, client);

  const reader = await createRuleReader(projectId, client);
  const [parkingRule, coreRule] = await Promise.all([reader.parkingRule(), reader.coreRule()]);
  w.merge(reader.warnings);

  const [layout, block, roof, generator, heating, spec] = await Promise.all([
    client.parkingLayout.findUnique({ where: { projectId } }),
    client.block.findUnique({
      where: { id: blockId },
      include: {
        core: { include: { elevators: true } },
        floors: { where: { floorType: "zemin" }, select: { hasCommercial: true } },
      },
    }),
    client.roof.findUnique({ where: { blockId } }),
    client.generator.findFirst({ where: { serviceSpace: { floor: { blockId } } } }),
    client.heatingCenter.findFirst({ where: { serviceSpace: { floor: { blockId } } } }),
    client.specificationSet.findFirst({ where: { projectId } }),
  ]);

  // --- Soru 1: hedef otopark sayısı (ön-dolum VAR) ---
  let parkingPrefill: number | null = null;
  if (parkingRule) {
    const parsed = validateFormula(parkingRule.requirementFormula, PARKING_REQUIREMENT);
    if (parsed.ok) {
      const unitCount = await client.unit.count({ where: { floor: { blockId } } });
      const evaluated = evaluateFormula(parsed.ast, PARKING_REQUIREMENT, {
        unitCount,
        totalFloorArea: null,
        commercialArea: null,
        residentialUnitCount: unitCount,
      });
      parkingPrefill = evaluated.value;
      w.merge(evaluated.warnings);
    } else {
      w.add("PARKING_FORMULA_INVALID", { code: parsed.error.code });
    }
  }

  // --- Soru 5: asansör sayısı (ön-dolum VAR) ---
  const elevator = block?.core?.elevators[0] ?? null;
  const elevatorPrefill = coreRule?.minElevatorCount ?? null;

  const answers: StartupAnswer[] = [
    {
      key: "targetParkingCount",
      prefilled: parkingPrefill === null ? null : String(parkingPrefill),
      value: str(layout?.targetCount) ?? (parkingPrefill === null ? null : String(parkingPrefill)),
      source: classify(str(parkingPrefill), str(layout?.targetCountOverrideValue)),
      hasPackageSource: true,
    },
    {
      key: "elevatorCount",
      prefilled: str(elevatorPrefill),
      value: str(elevator?.count) ?? str(elevatorPrefill),
      source: classify(str(elevatorPrefill), str(elevator?.countOverrideValue)),
      hasPackageSource: true,
    },

    // --- Ön-dolum kaynağı OLMAYAN altı soru ---
    // Dokümanın "kural katmanı ön-doldurur" ifadesi bunlar için karşılıksız;
    // hiçbir kural tablosunda kaynakları yok. Düz manuel alan kalıyorlar.
    {
      key: "heatingSystemType",
      prefilled: null,
      value: heating?.heatingSystemType ?? null,
      source: classify(null, heating?.heatingSystemType ?? null),
      hasPackageSource: false,
    },
    {
      key: "hasCommercialGroundFloor",
      prefilled: null,
      value: block?.floors[0] ? String(block.floors[0].hasCommercial) : null,
      source: classify(null, block?.floors[0] ? String(block.floors[0].hasCommercial) : null),
      hasPackageSource: false,
    },
    {
      key: "hasUnitStorages",
      prefilled: null,
      // AÇIK KARAR: dokümanda bu cevabın hedef alanı YOK. Kaydedilecek yer
      // tanımlanana kadar soru gösterilir ama saklanmaz.
      value: null,
      source: "empty",
      hasPackageSource: false,
    },
    {
      key: "roofType",
      prefilled: null,
      value: roof?.roofType ?? null,
      source: classify(null, roof?.roofType ?? null),
      hasPackageSource: false,
    },
    {
      key: "generatorScope",
      prefilled: null,
      value: generator?.scope ?? null,
      source: classify(null, generator?.scope ?? null),
      hasPackageSource: false,
    },
    {
      key: "specificationLevel",
      prefilled: null,
      // Alan İP-6'ya ait (SpecificationSet); soru burada sorulur, motor orada.
      value: spec?.selectedLevel ?? null,
      source: classify(null, spec?.selectedLevel ?? null),
      hasPackageSource: false,
    },
  ];

  // Sıra dokümandaki 8 soru sırası olsun.
  const ordered = STARTUP_QUESTION_KEYS.map((k) => answers.find((a) => a.key === k)!);

  return { answers: ordered, warnings: w.all };
}

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}
