"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  addStakeholder,
  deleteStakeholder,
  saveParcel,
  saveSiteData,
  saveSoilData,
  saveZoningData,
} from "@/lib/parcel/repository";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { errorMessage } from "@/lib/i18n/tr";
import type { Warning } from "@/lib/warnings";

/**
 * A1–A4 SİHİRBAZ EYLEMLERİ.
 *
 * İLKE 7 — "Kısıt ihlali engellemez, uyarır."
 * Kaydetme hiçbir zaman eksik alan yüzünden reddedilmez. Sonuç `ok: true`
 * döner ve uyarıları taşır; form onları gösterir ama ilerlemeyi durdurmaz.
 *
 * `ok: false` yalnızca GERÇEK hatalar içindir (kayıt yok, kiracı sızıntısı).
 */

export type ActionResult =
  | { ok: true; warnings?: Warning[] }
  | { ok: false; message: string; warnings?: Warning[] };

/** Boş dize → null. Yarım bırakılmış form alanı "boş" demektir, "0" değil. */
const text = (fd: FormData, key: string): string | null => {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/**
 * Sayısal alan. Geçersiz girdi null'a düşer ve KAYDI ENGELLEMEZ —
 * zod yalnızca ŞEKLİ doğrular, eksikliği değil.
 */
const decimal = (fd: FormData, key: string): Prisma.Decimal | null => {
  const s = text(fd, key);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? new Prisma.Decimal(n) : null;
};

const integer = (fd: FormData, key: string): number | null => {
  const s = text(fd, key);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

const bool = (fd: FormData, key: string): boolean => fd.get(key) === "on";

const enumOr = <T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null => {
  const s = text(fd, key);
  return s !== null && (allowed as readonly string[]).includes(s) ? (s as T) : null;
};

async function run(
  projectId: string,
  fn: () => Promise<Warning[] | void>,
): Promise<ActionResult> {
  try {
    const warnings = (await fn()) ?? [];
    // Her kayıttan sonra L0 yeniden hesaplanır: sağ paneldeki özet canlı kalır.
    const l0 = await computeAndStoreL0(projectId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, warnings: [...warnings, ...l0.warnings] };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

// ------------------------------------------------------------------ A1

export async function saveParcelAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await saveParcel(projectId, {
      province: text(formData, "province"),
      district: text(formData, "district"),
      neighborhood: text(formData, "neighborhood"),
      block: text(formData, "block"),
      parcelNo: text(formData, "parcelNo"),
      sheetNo: text(formData, "sheetNo"),
      area: decimal(formData, "area"),
      ownershipType: enumOr(formData, "ownershipType", [
        "tekMalik",
        "hisseli",
        "katMulkiyeti",
        "katIrtifaki",
      ] as const),
      ownerCount: integer(formData, "ownerCount"),
      hasExistingBuilding: bool(formData, "hasExistingBuilding"),
      existingBuildingAge: integer(formData, "existingBuildingAge"),
      existingBuildingFloors: integer(formData, "existingBuildingFloors"),
      existingBuildingUnitCount: integer(formData, "existingBuildingUnitCount"),
      existingTotalArea: decimal(formData, "existingTotalArea"),
      demolitionRequired: bool(formData, "demolitionRequired"),
      structuralAssessmentStatus: enumOr(formData, "structuralAssessmentStatus", [
        "yapilmadi",
        "riskliYapi",
        "riskliDegil",
        "itirazSurecinde",
      ] as const),
    });
  });
}

// ------------------------------------------------------------------ A2

export async function saveZoningAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await saveZoningData(projectId, {
      planNotes: text(formData, "planNotes"),
      buildingOrder: enumOr(formData, "buildingOrder", [
        "ayrik",
        "bitisik",
        "blok",
        "ikizNizam",
      ] as const),
      groundCoverageRatio: decimal(formData, "groundCoverageRatio"),
      floorAreaRatio: decimal(formData, "floorAreaRatio"),
      setbackFront: decimal(formData, "setbackFront"),
      setbackSide: decimal(formData, "setbackSide"),
      setbackRear: decimal(formData, "setbackRear"),
      maxFloorCount: integer(formData, "maxFloorCount"),
      maxHeight: decimal(formData, "maxHeight"),
      heightReferenceRuleKey: text(formData, "heightReferenceRuleKey"),
      referenceLevel: decimal(formData, "referenceLevel"),
      levelDataSource: enumOr(formData, "levelDataSource", [
        "resmiKroki",
        "demServisi",
        "manuel",
      ] as const),
    });
  });
}

// ------------------------------------------------------------------ A3

export async function saveSoilAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await saveSoilData(projectId, {
      soilClass: text(formData, "soilClass"),
      bearingCapacity: decimal(formData, "bearingCapacity"),
      groundwaterLevel: decimal(formData, "groundwaterLevel"),
      liquefactionRisk: enumOr(formData, "liquefactionRisk", [
        "yok",
        "dusuk",
        "orta",
        "yuksek",
      ] as const),
      foundationType: enumOr(formData, "foundationType", [
        "radye",
        "tekil",
        "surekli",
        "kazikli",
      ] as const),
      pileRequired: bool(formData, "pileRequired"),
      shoringRequired: bool(formData, "shoringRequired"),
      shoringMethod: text(formData, "shoringMethod"),
      shoringArea: decimal(formData, "shoringArea"),
    });
    await saveSiteData(projectId, {
      topographyLevelDifference: decimal(formData, "topographyLevelDifference"),
      excavationHaulDistance: decimal(formData, "excavationHaulDistance"),
      disposalSiteFee: decimal(formData, "disposalSiteFee"),
      siteAccessRoadWidth: decimal(formData, "siteAccessRoadWidth"),
      craneFeasible: bool(formData, "craneFeasible"),
      siteFencePerimeter: decimal(formData, "siteFencePerimeter"),
      fencedSides: integer(formData, "fencedSides"),
    });
  });
}

// ------------------------------------------------------------------ A4

export async function addStakeholderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    const name = text(formData, "name");
    if (name === null) throw new Error("DATUM_NOT_FOUND: ad girilmedi");
    await addStakeholder(projectId, {
      name,
      contactPhone: text(formData, "contactPhone"),
      contactEmail: text(formData, "contactEmail"),
      shareRatio: decimal(formData, "shareRatio"),
      existingUnitArea: decimal(formData, "existingUnitArea"),
      expectationNotes: text(formData, "expectationNotes"),
      agreementStance: enumOr(formData, "agreementStance", [
        "olumlu",
        "kararsiz",
        "itirazci",
      ] as const),
    });
  });
}

export async function deleteStakeholderAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await deleteStakeholder(projectId, String(formData.get("stakeholderId")));
  });
}

/** Kullanıcı istediğinde L0'ı yeniden hesaplar (form kaydetmeden). */
export async function recomputeL0Action(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => []);
}
