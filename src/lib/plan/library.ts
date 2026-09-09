import type { PrismaClient } from "@prisma/client";
import { prisma, scopedPrisma } from "@/lib/db/client";
import { currentOrganizationId } from "@/lib/db/tenant";
import { parseLayoutRecipe, recipeLeaves, validateRecipe } from "./template";

/**
 * TİPOLOJİ KÜTÜPHANESİ — organizasyon seviyesi.
 *
 * `UnitTypeTemplate` bir KÖK VARLIKTIR (`organizationId` taşır ve
 * `ORG_SCOPED_MODELS`'tedir), dolayısıyla `scopedPrisma` onu otomatik
 * filtreler — alt varlıklardan farklı olarak kökten gitmeye gerek yoktur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * NEDEN BÖLGE PAKETİNDE DEĞİL.
 *
 * Bir tipoloji şablonu MEVZUAT DEĞİL, FİRMA ALIŞKANLIĞIDIR — bölgeye değil,
 * tasarımı yapana aittir. Pakete konsaydı "salonu 2 m² büyüttük" yeni bir
 * paket SÜRÜMÜ gerektirirdi ve ilke 2 yönetmelik değişimiyle mimari tercihi
 * aynı kefeye koyardı.
 *
 * NEDEN KOPYALANIR, REFERANS VERİLMEZ.
 *
 * Kütüphanedeki şablonu iyileştirmek BİTEN BİR PROJEYİ geriye dönük
 * değiştirmemelidir — ilke 2'nin ruhu, mevzuata değil mimari alışkanlığa
 * uygulanmış hâli. Kopya `UnitType`'a gider; kaynağı `sourceTemplateId` +
 * `sourceTemplateVersion` ile izlenir ama bu CANLI BİR REFERANS DEĞİLDİR.
 * ─────────────────────────────────────────────────────────────────────────
 */

type Client = PrismaClient;

export interface TemplateSummary {
  readonly id: string;
  readonly templateCode: string;
  readonly version: string;
  /** Reçetedeki mekan sayısı; reçete okunamıyorsa null. */
  readonly spaceCount: number | null;
  /** Şablon geçerli mi — bozuksa kopyalanmamalı. */
  readonly problems: readonly string[];
}

/** Kütüphanedeki şablonlar. Kök varlık olduğu için kiracı filtresi otomatiktir. */
export async function listTemplates(client: Client = prisma): Promise<TemplateSummary[]> {
  const rows = await scopedPrisma(client, currentOrganizationId()).unitTypeTemplate.findMany({
    orderBy: [{ templateCode: "asc" }, { version: "asc" }],
  });

  return rows.map((r) => {
    const recipe = parseLayoutRecipe(r.layoutRecipe);
    return {
      id: r.id,
      templateCode: r.templateCode,
      version: r.version,
      spaceCount: recipe === null ? null : recipeLeaves(recipe.root).length,
      problems: recipe === null ? ["DATUM_RECIPE_UNREADABLE"] : validateRecipe(recipe),
    };
  });
}

/**
 * Şablonu projeye KOPYALAR.
 *
 * `unitTypeCode` verilmezse şablonun kodu kullanılır. Aynı kod zaten varsa
 * reçetesi GÜNCELLENİR (yeniden kopyalama), mekan listesi KORUNUR: kullanıcı
 * A5'te hedef alanları değiştirmiş olabilir ve şablon YAPIYI taşır, hedefi
 * değil.
 *
 * BOZUK ŞABLON KOPYALANMAZ: geçersiz bir reçete projeye girerse plan üretimi
 * her koşuda sessizce boş döner.
 */
export async function copyTemplateToProject(
  projectId: string,
  templateId: string,
  client: Client = prisma,
  unitTypeCode?: string,
): Promise<{ unitTypeId: string; unitTypeCode: string }> {
  const scoped = scopedPrisma(client, currentOrganizationId());

  const project = await scoped.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) throw new Error(`DATUM_NOT_FOUND: proje bulunamadı: ${projectId}`);

  const template = await scoped.unitTypeTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`DATUM_NOT_FOUND: şablon bulunamadı: ${templateId}`);

  const recipe = parseLayoutRecipe(template.layoutRecipe);
  if (recipe === null) throw new Error(`DATUM_TEMPLATE_UNREADABLE: ${template.templateCode}`);
  const problems = validateRecipe(recipe);
  if (problems.length > 0) {
    throw new Error(`DATUM_TEMPLATE_INVALID: ${problems.join(", ")}`);
  }

  const code = unitTypeCode ?? template.templateCode;

  const row = await client.unitType.upsert({
    where: { projectId_unitTypeCode: { projectId, unitTypeCode: code } },
    create: {
      projectId,
      unitTypeCode: code,
      layoutRecipe: template.layoutRecipe ?? undefined,
      relationAssertions: template.relationAssertions ?? undefined,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
    },
    update: {
      // `spaceList` KORUNUR — kullanıcının A5'te girdiği hedef alanlar
      // şablonun yapısından bağımsızdır.
      layoutRecipe: template.layoutRecipe ?? undefined,
      relationAssertions: template.relationAssertions ?? undefined,
      sourceTemplateId: template.id,
      sourceTemplateVersion: template.version,
    },
    select: { id: true, unitTypeCode: true },
  });

  return { unitTypeId: row.id, unitTypeCode: row.unitTypeCode };
}
