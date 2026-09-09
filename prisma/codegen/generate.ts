/**
 * KOD ÜRETİCİ — prisma/computed-fields.ts kayıt defterinden üretir:
 *
 *   1. prisma/sql/computed-columns.sql   generated kolonlar (migration'a eklenir)
 *   2. prisma/sql/override-ledger.sql    "bu projedeki tüm ezmeler" view'ı
 *   3. src/lib/computed/generated.ts     tipler ve yazma koruması
 *   4. src/lib/fields/generated.ts       kademe kataloğu (sihirbaz alan görünürlüğü)
 *
 * View ÜRETİLDİĞİ için bayatlayamaz: yeni bir hesaplanan alan eklendiğinde
 * view da otomatik büyür. Elle yazılmış bir UNION'da unutulan alan, raporda
 * görünmeyen bir ezme demek olurdu.
 *
 *   npm run codegen         — üret
 *   npm run codegen:check   — üretilenler güncel mi (CI)
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  COMPUTED_MODELS,
  computedColumn,
  overrideColumn,
  reasonColumn,
  computedFieldCount,
} from "../computed-fields.js";
import { parseAllAnnotations } from "./parse-schema.js";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SQL_DIR = path.join(ROOT, "prisma", "sql");
const TS_DIR = path.join(ROOT, "src", "lib", "computed");
const FIELDS_DIR = path.join(ROOT, "src", "lib", "fields");

const BANNER = `-- ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
-- Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
-- Yeniden üretmek için: npm run codegen
`;

// ---------------------------------------------------------------- 1. kolonlar

function generateComputedColumnsSql(): string {
  const out: string[] = [
    BANNER,
    `-- Hesaplanan alanların DÖRDÜNCÜ kolonu: GENERATED ALWAYS AS ... STORED.`,
    `-- Prisma bu kolonu sıradan nullable kolon olarak oluşturur; burada düşürülüp`,
    `-- generated olarak yeniden eklenir. Böylece kolon YAZILAMAZ hale gelir ve`,
    `-- "COALESCE yapmayı unuttum" hatası yapısal olarak imkânsızlaşır (ilke 5).`,
    ``,
  ];

  for (const m of COMPUTED_MODELS) {
    out.push(`-- ${m.model} (${m.table})`);
    for (const f of m.fields) {
      const c = computedColumn(f.field);
      const o = overrideColumn(f.field);
      out.push(
        `ALTER TABLE "${m.table}" DROP COLUMN IF EXISTS "${f.field}";`,
        `ALTER TABLE "${m.table}" ADD COLUMN "${f.field}" ${f.sqlType}`,
        `  GENERATED ALWAYS AS (COALESCE("${o}", "${c}")) STORED;`,
      );
    }
    out.push(``);
  }

  return out.join("\n");
}

// ------------------------------------------------------------------ 2. view

function generateOverrideLedgerSql(): string {
  const branches: string[] = [];

  for (const m of COMPUTED_MODELS) {
    for (const f of m.fields) {
      const c = computedColumn(f.field);
      const o = overrideColumn(f.field);
      const r = reasonColumn(f.field);
      branches.push(
        [
          `  SELECT`,
          `    '${m.model}'::text            AS "entityType",`,
          `    t."id"                        AS "entityId",`,
          `    ${m.projectIdExpr}            AS "projectId",`,
          `    '${f.field}'::text            AS "fieldKey",`,
          `    to_jsonb(t."${c}")            AS "computedValue",`,
          `    to_jsonb(t."${o}")            AS "overrideValue",`,
          `    t."${r}"                      AS "overrideReason"`,
          `  FROM "${m.table}" t`,
          m.joins ? `  ${m.joins}` : null,
          `  WHERE t."${o}" IS NOT NULL`,
        ]
          .filter((l): l is string => l !== null)
          .join("\n"),
      );
    }
  }

  return [
    BANNER,
    `-- Ezilmiş DEĞERLERİN tümü, tek sorguda:`,
    `--   SELECT * FROM "OverrideLedger" WHERE "projectId" = $1;`,
    `--`,
    `-- İlke 5 (ezme işaretlenir) ve ilke 10 (rapor denetlenebilir) bu view ile karşılanır.`,
    `-- ${computedFieldCount()} hesaplanan alan · ${branches.length} dal.`,
    `-- Yalnızca overrideValue DOLU satırlar listelenir.`,
    ``,
    `DROP VIEW IF EXISTS "OverrideLedger";`,
    `CREATE VIEW "OverrideLedger" AS`,
    branches.join("\n  UNION ALL\n"),
    `;`,
    ``,
  ].join("\n");
}

// ------------------------------------------------------------------- 3. tipler

function generateTypes(): string {
  const modelBlocks = COMPUTED_MODELS.map((m) => {
    const fields = m.fields.map((f) => `    "${f.field}"`).join(",\n");
    return `  ${m.model}: [\n${fields},\n  ],`;
  }).join("\n");

  const total = computedFieldCount();

  return `/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
 * Kaynak: prisma/computed-fields.ts · Üretici: prisma/codegen/generate.ts
 * Yeniden üretmek için: npm run codegen
 *
 * ${total} hesaplanan alan, ${COMPUTED_MODELS.length} modelde.
 */

/** Her modelin GENERATED (yazılamaz) kolonları. */
export const GENERATED_COLUMNS = {
${modelBlocks}
} as const;

export type GeneratedColumns = typeof GENERATED_COLUMNS;
export type ModelWithComputed = keyof GeneratedColumns;

/** Bir modelin yazılamaz kolon adları. */
export type GeneratedColumnOf<M extends ModelWithComputed> =
  GeneratedColumns[M][number];

/**
 * Bir yazma yükünden GENERATED kolonları çıkarır.
 *
 * Postgres bu kolonlara yazmayı zaten REDDEDER; bu tip o hatayı
 * çalışma zamanından DERLEME zamanına taşır.
 *
 *   type UnitCreate = WritablePayload<"Unit", Prisma.UnitUncheckedCreateInput>;
 *   // netArea, grossArea, balconyArea ... artık payload'da YOK
 */
export type WritablePayload<M extends ModelWithComputed, T> = Omit<
  T,
  GeneratedColumnOf<M> & keyof T
>;

/** Çalışma zamanı koruması — repository katmanı bunu kullanır. */
export function stripGeneratedColumns<M extends ModelWithComputed, T extends object>(
  model: M,
  payload: T,
): WritablePayload<M, T> {
  const banned = new Set<string>(GENERATED_COLUMNS[model] as readonly string[]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!banned.has(k)) out[k] = v;
  }
  return out as WritablePayload<M, T>;
}

/** Bir yükün yazılamaz kolon içerip içermediğini söyler (test ve guard için). */
export function findGeneratedColumnViolations(
  model: ModelWithComputed,
  payload: object,
): string[] {
  const banned = new Set<string>(GENERATED_COLUMNS[model] as readonly string[]);
  return Object.keys(payload).filter((k) => banned.has(k));
}
`;
}

// ------------------------------------------------------- 4. kademe kataloğu

function generateFieldCatalog(): string {
  const annotations = parseAllAnnotations(path.join(ROOT, "prisma", "schema"));

  // Yalnızca KADEMESİ OLAN alanlar sihirbaz girdisidir. Hesaplanan alanların
  // ve altyapı alanlarının (id, FK, zaman damgası) kademesi yoktur.
  const byModel = new Map<string, { field: string; tier: string; own: string[]; src: string | null }[]>();
  for (const a of annotations) {
    if (a.tier === null) continue;
    const list = byModel.get(a.model) ?? [];
    list.push({ field: a.field, tier: a.tier, own: [...a.ownership], src: a.src });
    byModel.set(a.model, list);
  }

  const models = [...byModel.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const total = models.reduce((n, [, fields]) => n + fields.length, 0);

  const blocks = models
    .map(([model, fields]) => {
      const rows = fields
        .map(
          (f) =>
            `    ${f.field}: { tier: "${f.tier}", ownership: [${f.own
              .map((o) => `"${o}"`)
              .join(", ")}], src: ${f.src === null ? "null" : `"${f.src}"`} },`,
        )
        .join("\n");
      return `  ${model}: {\n${rows}\n  },`;
    })
    .join("\n");

  return `/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEME.
 * Kaynak: prisma/schema/*.prisma içindeki /// @tier @own @src açıklamaları
 * Üretici: prisma/codegen/generate.ts · Yeniden üretmek için: npm run codegen
 *
 * SİHİRBAZ ALAN KATALOĞU — "kademeye göre alan gösterimi" (İP-2).
 *
 * Yalnızca KADEMESİ OLAN alanlar buradadır: hesaplanan alanlar ve altyapı
 * alanları (id, FK, zaman damgası) sihirbaz GİRDİSİ değildir.
 *
 * ${total} alan, ${models.length} modelde.
 */

export type FieldTier = "K1" | "K2" | "K3";
export type FieldOwnership = "M" | "B" | "H" | "P" | "E";

export interface CatalogEntry {
  readonly tier: FieldTier;
  readonly ownership: readonly FieldOwnership[];
  /** Dokümandaki kaynak BÖLÜM — ör. "etut-veri-modeli.md§3". */
  readonly src: string | null;
}

export const FIELD_CATALOG = {
${blocks}
} as const satisfies Record<string, Record<string, CatalogEntry>>;

export type CatalogModel = keyof typeof FIELD_CATALOG;

const TIER_ORDER: Record<FieldTier, number> = { K1: 1, K2: 2, K3: 3 };

/**
 * Bir modelin verilen kademede GÖRÜNEN alanları.
 *
 * Görünürlük KÜMÜLATİFTİR: K2 projesinde K1 ∪ K2 alanları görünür.
 * Kademe yalnızca görünürlüğü kapatır, ASLA zorunluluk üretmez —
 * "kademe yükseltince önceki veriler korunur" (etut-surec-modeli.md§2).
 */
export function fieldsForTier<M extends CatalogModel>(
  model: M,
  tier: FieldTier,
): (keyof (typeof FIELD_CATALOG)[M])[] {
  const entries = FIELD_CATALOG[model] as Record<string, CatalogEntry>;
  return Object.entries(entries)
    .filter(([, e]) => TIER_ORDER[e.tier] <= TIER_ORDER[tier])
    .map(([field]) => field) as (keyof (typeof FIELD_CATALOG)[M])[];
}

/** Alanın kademe bilgisi; katalogda yoksa null (sihirbaz girdisi değil). */
export function catalogEntry(model: string, field: string): CatalogEntry | null {
  const entries = (FIELD_CATALOG as Record<string, Record<string, CatalogEntry>>)[model];
  return entries?.[field] ?? null;
}
`;
}

// ---------------------------------------------------------------------- main

function write(file: string, content: string, check: boolean): boolean {
  if (check) {
    if (!existsSync(file)) {
      console.error(`  EKSİK: ${path.relative(ROOT, file)}`);
      return false;
    }
    const current = readFileSync(file, "utf8");
    if (current !== content) {
      console.error(`  BAYAT: ${path.relative(ROOT, file)}`);
      return false;
    }
    return true;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, "utf8");
  console.log(`  yazıldı: ${path.relative(ROOT, file)}`);
  return true;
}

const check = process.argv.includes("--check");
console.log(
  check ? "Üretilen dosyalar denetleniyor…" : "Hesaplanan alan altyapısı üretiliyor…",
);

const results = [
  write(path.join(SQL_DIR, "computed-columns.sql"), generateComputedColumnsSql(), check),
  write(path.join(SQL_DIR, "override-ledger.sql"), generateOverrideLedgerSql(), check),
  write(path.join(TS_DIR, "generated.ts"), generateTypes(), check),
  write(path.join(FIELDS_DIR, "generated.ts"), generateFieldCatalog(), check),
];

if (results.some((ok) => !ok)) {
  console.error(
    "\nÜretilen dosyalar güncel değil. `npm run codegen` çalıştırıp sonucu commit'leyin.",
  );
  process.exit(1);
}

console.log(
  `\n${computedFieldCount()} hesaplanan alan · ${COMPUTED_MODELS.length} model · ${computedFieldCount() * 4} kolon.`,
);
