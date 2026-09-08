/**
 * KOD ÜRETİCİ — prisma/computed-fields.ts kayıt defterinden üretir:
 *
 *   1. prisma/sql/computed-columns.sql   generated kolonlar (migration'a eklenir)
 *   2. prisma/sql/override-ledger.sql    "bu projedeki tüm ezmeler" view'ı
 *   3. src/lib/computed/generated.ts     tipler ve yazma koruması
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

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SQL_DIR = path.join(ROOT, "prisma", "sql");
const TS_DIR = path.join(ROOT, "src", "lib", "computed");

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
