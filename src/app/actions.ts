"use server";

import { revalidatePath } from "next/cache";
import type { ProjectType, Tier } from "@prisma/client";
import { createProject, deleteProject } from "@/lib/projects/repository";
import { bindProjectToPackageVersion } from "@/lib/region-package/version";
import { errorMessage } from "@/lib/i18n/tr";

export type ActionResult = { ok: true } | { ok: false; message: string };

/**
 * İlke 7 — "Kısıt ihlali engellemez, uyarır."
 * Eylemler hata FIRLATMAZ; sonucu döndürür, arayüz uyarı olarak gösterir.
 * Bu yüzden imzalar `useActionState` ile uyumludur.
 */

export async function createProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await createProject({
      name: String(formData.get("name") ?? "").trim(),
      projectType: String(formData.get("projectType")) as ProjectType,
      tier: String(formData.get("tier")) as Tier,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function deleteProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await deleteProject(String(formData.get("id")));
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function bindProjectAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await bindProjectToPackageVersion(
      String(formData.get("projectId")),
      String(formData.get("versionId")),
    );
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
