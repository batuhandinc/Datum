"use server";

import { revalidatePath } from "next/cache";
import { $Enums } from "@prisma/client";
import { errorMessage } from "@/lib/i18n/tr";
import type { Warning } from "@/lib/warnings";
import {
  addFloor,
  deleteFloor,
  ensureDefaultBlock,
  instantiateUnitType,
  saveUnitType,
  setFloorLock,
  updateFloor,
} from "@/lib/program/repository";
import { computeAndStoreL1 } from "@/lib/core/service";
import { parseSpaceLines } from "@/lib/program/schemas";
import { chooseParkingScenario, saveStartupAnswers } from "@/lib/startup/repository";

/**
 * A5 PROGRAM — sunucu eylemleri.
 *
 * A1–A4'ün `ActionResult` + `run()` deseninin aynısı: eksik alan kaydı
 * ENGELLEMEZ (ilke 7), yalnızca gerçek hatalar `ok: false` döner.
 *
 * Her yazmadan sonra L1 yeniden hesaplanır: program değişince çekirdek
 * ölçüsü ve gereken asansör adedi de değişir.
 */

export type ActionResult =
  | { ok: true; warnings?: Warning[] }
  | { ok: false; message: string; warnings?: Warning[] };

async function run(
  projectId: string,
  fn: () => Promise<Warning[] | void>,
): Promise<ActionResult> {
  try {
    const own = (await fn()) ?? [];
    const l1 = await computeAndStoreL1(projectId);
    revalidatePath(`/projects/${projectId}/program`);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, warnings: [...own, ...l1.warnings] };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

const text = (fd: FormData, key: string): string | null => {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  return v.trim();
};

const integer = (fd: FormData, key: string): number | null => {
  const v = text(fd, key);
  if (v === null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const decimalString = (fd: FormData, key: string): string | null => {
  const v = text(fd, key);
  if (v === null) return null;
  const normalized = v.replace(",", ".");
  return Number.isFinite(Number(normalized)) ? normalized : null;
};

const bool = (fd: FormData, key: string): boolean => fd.get(key) === "on";

// -------------------------------------------------------------------- katlar

export async function addFloorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    const floorNo = integer(formData, "floorNo");
    const floorType = text(formData, "floorType");
    if (floorNo === null || floorType === null) {
      throw new Error("DATUM_FLOOR_INCOMPLETE");
    }
    await addFloor(projectId, {
      floorNo,
      floorType: floorType as $Enums.FloorType,
      grossHeight: decimalString(formData, "grossHeight"),
      hasCommercial: bool(formData, "hasCommercial"),
    });
  });
}

export async function deleteFloorAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await deleteFloor(projectId, String(formData.get("floorId")));
  });
}

export async function setFloorLockAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await setFloorLock(
      projectId,
      String(formData.get("floorId")),
      bool(formData, "isLocked"),
      text(formData, "templateFloorId"),
    );
  });
}

export async function updateFloorHeightAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await updateFloor(projectId, String(formData.get("floorId")), {
      grossHeight: decimalString(formData, "grossHeight"),
      hasCommercial: bool(formData, "hasCommercial"),
    });
  });
}

// --------------------------------------------------------------- tipolojiler

export async function saveUnitTypeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    const code = text(formData, "unitTypeCode");
    if (code === null) throw new Error("DATUM_UNIT_TYPE_CODE_REQUIRED");
    const spaces = parseSpaceLines(String(formData.get("spaces") ?? ""));
    await saveUnitType(projectId, code, spaces);
  });
}

export async function instantiateUnitTypeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    const count = integer(formData, "count") ?? 0;
    if (count <= 0) throw new Error("DATUM_INSTANCE_COUNT_INVALID");
    await instantiateUnitType(
      projectId,
      String(formData.get("floorId")),
      String(formData.get("unitTypeCode")),
      count,
    );
  });
}

// ----------------------------------------------------- 8 soruluk sihirbaz

/**
 * Sihirbaz cevaplarını yazar.
 *
 * ÖN-DOLDURULAN İLE DEĞİŞTİRİLEN AYRIMI: kullanıcının yazdığı değer
 * `*OverrideValue`'ya gider, paketin önerdiği `*ComputedValue`'da kalır.
 * Böylece iki değer de görünür ve rapor hangisinin kimden geldiğini söyler.
 */
export async function saveStartupAnswersAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    await saveStartupAnswers(projectId, {
      targetParkingCount: integer(formData, "targetParkingCount"),
      elevatorCount: integer(formData, "elevatorCount"),
      hasCommercialGroundFloor: bool(formData, "hasCommercialGroundFloor"),
      roofType: text(formData, "roofType"),
      specificationLevel: text(formData, "specificationLevel"),
    });
  });
}

// ------------------------------------------------------------------ otopark

/**
 * Kullanıcının seçtiği otopark senaryosunu KALICI hâle getirir.
 *
 * Senaryolar saklanmaz; kalıcı olan yalnızca KARAR. Eksikli bir senaryo
 * seçilirse seçim anındaki eksik `acceptedDeficitCount`'a yazılır —
 * "2 park eksik olduğu bilinerek 1 bodrum seçildi" bir RİSK KABULÜDÜR ve
 * İP-9 raporunda görünmelidir.
 */
export async function chooseParkingScenarioAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const projectId = String(formData.get("projectId"));
  return run(projectId, async () => {
    const basementFloorCount = integer(formData, "basementFloorCount");
    if (basementFloorCount === null) throw new Error("DATUM_SCENARIO_INVALID");

    await chooseParkingScenario(projectId, {
      basementFloorCount,
      plannedCount: integer(formData, "plannedCount"),
      requiredCount: integer(formData, "requiredCount"),
      deficitCount: integer(formData, "deficitCount") ?? 0,
      reason: text(formData, "reason"),
    });
  });
}
