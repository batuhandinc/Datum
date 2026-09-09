import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * ŞEMA AÇIKLAMA AYRIŞTIRICISI.
 *
 * `.prisma` dosyalarındaki yapısal `///` açıklamalarını okur:
 *
 *     /// @tier K2 @own M @src etut-veri-modeli.md:200
 *     width Decimal? @db.Decimal(8, 3)
 *
 * İP-1 bu açıklamaları YAZDI ama hiçbir kod OKUMUYORDU — ölü metadata'ydı.
 * İP-2'nin "kademeye göre alan gösterimi" maddesi buradan besleniyor.
 *
 * DÖRT ANOMALİ (İP-1'de kayda geçmişti, burada ele alınıyor):
 *
 *  1. Hesaplanan alanların `@tier`'ı YOK — sadece `@own H`. Doğru davranış:
 *     hesaplanan alan sihirbaz GİRDİSİ değildir, `tier: null` kalır ve form
 *     onu girdi olarak göstermez (sonuç panelinde gösterilir).
 *  2. `@tier K2-K3` gibi ARALIK değeri (v1.2'de dokümanda ayrıştırıldı, ama
 *     ayrıştırıcı yine de tolere eder ve alt sınırı alır).
 *  3. `@tier —` literal em-dash (`Project.notes`) → `unspecified`.
 *  4. Bir `///` bloğu BİRDEN ÇOK ardışık alanı kapsar:
 *
 *         /// @tier K1 @own M @src etut-veri-modeli.md:160
 *         existingBuildingAge       Int?
 *         existingBuildingFloors    Int?
 *         existingBuildingUnitCount Int?
 *
 *     Blok, boş satıra veya yeni bir `///` bloğuna kadar geçerlidir.
 */

export type Tier = "K1" | "K2" | "K3";
export type Ownership = "M" | "B" | "H" | "P" | "E";

export interface FieldAnnotation {
  readonly model: string;
  readonly field: string;
  /** null = kademe belirtilmemiş (hesaplanan alanlar, altyapı alanları). */
  readonly tier: Tier | null;
  /** Belirtilmemişse boş dizi. `M/B` gibi çoklu sahiplik ayrıştırılır. */
  readonly ownership: readonly Ownership[];
  /** `dosya:satır` — dokümandaki kaynak. Belirtilmemişse null. */
  readonly src: string | null;
  /** Prisma tip ifadesi, ör. `Decimal?`. */
  readonly type: string;
}

const TIER_VALUES: readonly string[] = ["K1", "K2", "K3"];
const OWNERSHIP_VALUES: readonly string[] = ["M", "B", "H", "P", "E"];

/** Alan satırı: `ad  Tip ...`. Blok kapanışı, @@ direktifi ve yorum hariç. */
const FIELD_LINE = /^([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z[\]?]+)/;

interface Annotation {
  tier: Tier | null;
  ownership: Ownership[];
  src: string | null;
}

function parseAnnotationBlock(lines: readonly string[]): Annotation {
  const text = lines.join(" ");

  let tier: Tier | null = null;
  const tierMatch = /@tier\s+(\S+)/.exec(text);
  if (tierMatch?.[1]) {
    // Anomali 2: "K2-K3" aralığı → alt sınır. Anomali 3: "—" → unspecified.
    const raw = tierMatch[1].split(/[-–—]/)[0]!;
    if (TIER_VALUES.includes(raw)) tier = raw as Tier;
  }

  const ownership: Ownership[] = [];
  const ownMatch = /@own\s+(\S+)/.exec(text);
  if (ownMatch?.[1]) {
    for (const part of ownMatch[1].split("/")) {
      if (OWNERSHIP_VALUES.includes(part)) ownership.push(part as Ownership);
    }
  }

  const srcMatch = /@src\s+(\S+:\d+)/.exec(text);
  const src = srcMatch?.[1] ?? null;

  return { tier, ownership, src };
}

/** Bir `.prisma` metnindeki tüm model alanlarını açıklamalarıyla döndürür. */
export function parseSchemaAnnotations(schemaText: string): FieldAnnotation[] {
  const out: FieldAnnotation[] = [];

  let model: string | null = null;
  let pending: string[] = [];
  let active: Annotation | null = null;

  for (const rawLine of schemaText.split("\n")) {
    const line = rawLine.trim();

    const modelStart = /^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/.exec(line);
    if (modelStart) {
      model = modelStart[1]!;
      pending = [];
      active = null;
      continue;
    }

    if (line === "}") {
      model = null;
      pending = [];
      active = null;
      continue;
    }

    if (model === null) continue;

    if (line.startsWith("///")) {
      pending.push(line.slice(3).trim());
      continue;
    }

    // Boş satır veya sıradan yorum: açık bloğu KAPATIR (anomali 4'ün sınırı).
    if (line === "" || line.startsWith("//")) {
      if (pending.length > 0) {
        active = parseAnnotationBlock(pending);
        pending = [];
      }
      if (line === "") active = null;
      continue;
    }

    if (line.startsWith("@@")) continue;

    const field = FIELD_LINE.exec(line);
    if (!field) continue;

    if (pending.length > 0) {
      active = parseAnnotationBlock(pending);
      pending = [];
    }

    out.push({
      model,
      field: field[1]!,
      type: field[2]!,
      tier: active?.tier ?? null,
      ownership: active?.ownership ?? [],
      src: active?.src ?? null,
    });
  }

  return out;
}

/** `prisma/schema` altındaki tüm dosyaları okur. */
export function readSchemaFiles(schemaDir: string): { file: string; text: string }[] {
  return readdirSync(schemaDir)
    .filter((f) => f.endsWith(".prisma"))
    .sort()
    .map((f) => ({ file: f, text: readFileSync(path.join(schemaDir, f), "utf8") }));
}

export function parseAllAnnotations(schemaDir: string): FieldAnnotation[] {
  return readSchemaFiles(schemaDir).flatMap((f) => parseSchemaAnnotations(f.text));
}

/**
 * Bir alan hangi kademede GÖRÜNÜR?
 *
 * Görünürlük KÜMÜLATİFTİR: K2 projesinde K1 ∪ K2 alanları görünür.
 * Kademesi olmayan alan sihirbaz girdisi DEĞİLDİR — hiçbir kademede
 * girdi olarak gösterilmez.
 *
 * Kademe yalnızca GÖRÜNÜRLÜĞÜ kapatır, asla zorunluluk üretmez:
 * "kademe yükseltince önceki veriler korunur" (etut-surec-modeli.md:31).
 */
export function isVisibleAtTier(fieldTier: Tier | null, projectTier: Tier): boolean {
  if (fieldTier === null) return false;
  const order: Record<Tier, number> = { K1: 1, K2: 2, K3: 3 };
  return order[fieldTier] <= order[projectTier];
}
