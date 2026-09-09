"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/i18n/tr";
import type { Warning } from "@/lib/warnings";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { computeAndStoreL1 } from "@/lib/core/service";
import { applyCuts, parseCutLines, remainderOf } from "@/lib/plan/manual";
import {
  clearManualPartition,
  loadPlanContext,
  writePartition,
  type UnitAssignment,
} from "@/lib/plan/repository";
import { computeAndStoreL2, computeAndStoreL3 } from "@/lib/plan/service";
import { computeAndStoreL4 } from "@/lib/plan/l4-service";

/**
 * A5 PLAN — sunucu eylemleri.
 *
 * ok:false YALNIZCA gerçek hatalar için (proje yok, kiracı sızıntısı).
 * Kısıt ihlali kaydı ENGELLEMEZ (ilke 7); uyarı olarak döner.
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
    // ZİNCİR SIRASI: L0 zarfı, L1 çekirdeği üretir; plan ikisini de okur.
    await computeAndStoreL0(projectId);
    const l1 = await computeAndStoreL1(projectId);
    revalidatePath(`/projects/${projectId}/plan`);
    revalidatePath(`/projects/${projectId}/program`);
    return { ok: true, warnings: [...own, ...l1.warnings] };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Kesme çizgilerini uygular ve parçaları birimlere yazar.
 *
 * Manuel mod EZME yazar: `Unit.geometryOverrideValue`. Böylece L2 yeniden
 * koştuğunda kullanıcının çizimi yok edilmez.
 */
export async function savePartitionAction(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const projectId = text(fd, "projectId");
  const floorId = text(fd, "floorId");

  return run(projectId, async () => {
    const context = await loadPlanContext(projectId);
    const floor = context.floors.find((f) => f.floorId === floorId);
    if (!floor) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

    const plate = largestPart(context);
    const region = remainderOf(plate, context.core, context.circulation);
    const cuts = parseCutLines(safeJson(text(fd, "cuts")));
    const blocked = [...(context.core ? [context.core] : []), ...context.circulation];
    const result = applyCuts(region, cuts, blocked);

    // Eşleşme: parça indeksi → birim id. Kullanıcı seçer; sistem karar vermez.
    const raw = safeJson(text(fd, "assignments"));
    const map = Array.isArray(raw) ? (raw as (string | null)[]) : [];

    const assignments: UnitAssignment[] = floor.units.map((u) => {
      const pieceIndex = map.findIndex((unitId) => unitId === u.unitId);
      return {
        unitId: u.unitId,
        geometry: pieceIndex >= 0 ? (result.pieces[pieceIndex] ?? null) : null,
      };
    });

    await writePartition(projectId, assignments, "manuel");
    return [...result.warnings];
  });
}

/**
 * L2 OTOMATİK bölümlemeyi çalıştırır.
 *
 * Sonuç `geometryComputedValue`'ya yazılır; kullanıcının manuel çizimi
 * `OverrideValue`'da durduğu için YOK EDİLMEZ — COALESCE ezmeyi seçmeye
 * devam eder. Otomatik sonucu görmek isteyen önce manuel bölümlemeyi kaldırır.
 */
export async function runL2Action(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const projectId = text(fd, "projectId");
  const floorId = text(fd, "floorId");
  return run(projectId, async () => {
    const result = await computeAndStoreL2(projectId, floorId);
    return [...result.warnings];
  });
}

/**
 * L3 + L4: mekanları esnetir, duvarları ve açıklıkları üretir.
 *
 * ZİNCİR SIRASI: L3 her birim için ayrı ayrı koşar (mekan poligonları),
 * SONRA L4 kat genelinde duvarları türetir — duvar iki mekanın paylaştığı
 * sınırdan çıktığı için mekanlar önce yerleşmiş olmalıdır.
 */
export async function runDetailAction(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const projectId = text(fd, "projectId");
  const floorId = text(fd, "floorId");
  return run(projectId, async () => {
    const warnings: Warning[] = [];
    const context = await loadPlanContext(projectId);
    const floor = context.floors.find((f) => f.floorId === floorId);
    if (!floor) throw new Error(`DATUM_NOT_FOUND: kat bulunamadı: ${floorId}`);

    for (const u of floor.units) {
      const r = await computeAndStoreL3(projectId, u.unitId);
      warnings.push(...r.warnings);
    }
    const l4 = await computeAndStoreL4(projectId, floorId);
    warnings.push(...l4.warnings);
    return warnings;
  });
}

/** Manuel bölümlemeyi kaldırır — ezme silinir, hesaplanan değer geri gelir. */
export async function clearPartitionAction(
  _prev: ActionResult | null,
  fd: FormData,
): Promise<ActionResult> {
  const projectId = text(fd, "projectId");
  const floorId = text(fd, "floorId");
  return run(projectId, async () => {
    await clearManualPartition(projectId, floorId);
  });
}

function safeJson(raw: string): unknown {
  if (raw.trim() === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Zarfın en büyük parçası — plaka. L1 ile aynı seçim. */
function largestPart(context: Awaited<ReturnType<typeof loadPlanContext>>) {
  const mp = context.envelope;
  if (!mp || mp.coordinates.length === 0) return null;
  let best = mp.coordinates[0]!;
  let bestArea = -Infinity;
  for (const rings of mp.coordinates) {
    const ring = rings[0];
    if (!ring) continue;
    let a = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      a += ring[i]![0] * ring[i + 1]![1] - ring[i + 1]![0] * ring[i]![1];
    }
    const area = Math.abs(a / 2);
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  return { crs: "local-metric" as const, type: "Polygon" as const, coordinates: best };
}
