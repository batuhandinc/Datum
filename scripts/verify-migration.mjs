/**
 * Migration'ı gerçek bir Postgres motorunda çalıştırır ve İP-1'in
 * "bitti sayılır" ölçütünü doğrular — Docker gerektirmeden.
 *
 * PGlite süreç içinde çalışan WASM Postgres'tir. Gerçek Postgres'in yerini
 * TUTMAZ (uzantılar, eşzamanlılık, rol/izin davranışı farklıdır) ama şemayı,
 * generated kolonları, view'ı ve plpgsql trigger'larını gerçekten çalıştırır.
 *
 *   node scripts/verify-migration.mjs
 */

import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS = path.join(ROOT, "prisma", "migrations");

let pass = 0;
let fail = 0;

function check(name, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function expectError(db, sql, fragment, name) {
  try {
    await db.exec(sql);
    check(name, false, "hata bekleniyordu, sorgu BAŞARILI oldu");
  } catch (e) {
    check(name, String(e.message).includes(fragment), `beklenen "${fragment}", gelen: ${e.message}`);
  }
}

const db = new PGlite();

// ---------------------------------------------------------------- migration
console.log("\nMigration çalıştırılıyor…");
const dirs = readdirSync(MIGRATIONS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const d of dirs) {
  const file = path.join(MIGRATIONS, d, "migration.sql");
  try {
    await db.exec(readFileSync(file, "utf8"));
    check(`migration ${d}`, true);
  } catch (e) {
    check(`migration ${d}`, false, e.message);
    console.error("\nMigration çalışmadı; kalan testler atlandı.");
    process.exit(1);
  }
}

// ------------------------------------------------------------------ yapı
console.log("\nŞema yapısı…");
const one = async (q) => (await db.query(q)).rows[0];

const tables = await one(
  `select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
);
check(`tablolar oluştu (${tables.n})`, tables.n > 50);

// Beklenen sayı ÜRETİLEN SQL'den sayılır, elle yazılmaz: kayıt defterine alan
// eklemek bu dosyayı bayatlatmasın. (52 sabiti İP-3'te tam olarak böyle bozuldu.)
const expectedGenerated = (
  readFileSync(path.join(ROOT, "prisma", "sql", "computed-columns.sql"), "utf8").match(
    /^\s*GENERATED ALWAYS AS/gm,
  ) ?? []
).length;

const gen = await one(
  `select count(*)::int n from information_schema.columns where table_schema='public' and is_generated='ALWAYS'`,
);
check(
  `GENERATED kolonlar (${gen.n} adet, ${expectedGenerated} bekleniyor)`,
  gen.n === expectedGenerated,
);

const view = await one(
  `select count(*)::int n from information_schema.views where table_schema='public' and table_name='OverrideLedger'`,
);
check("OverrideLedger view var", view.n === 1);

// Beklenen sayı KAYNAKTAN sayılır, elle yazılmaz — GENERATED sayacıyla aynı
// gerekçe. Kural tablosu eklemek (22 → 24) bu satırı bayatlatmasın.
//   · dondurulan kural tabloları: `frozen_tables` dizisi
//   · ayrıca iki koruma trigger'ı: sürüm muhafızı + set-once
const immutabilitySql = readFileSync(path.join(ROOT, "prisma", "sql", "immutability.sql"), "utf8");
const frozenCount = (
  immutabilitySql.match(/frozen_tables text\[\] := ARRAY\[([\s\S]*?)\]/)?.[1].match(/'[a-z_]+'/g) ??
  []
).length;
const literalTriggerCount = (immutabilitySql.match(/^CREATE TRIGGER /gm) ?? []).length;
const expectedTriggerTables = frozenCount + literalTriggerCount;

const trg = await one(
  `select count(distinct event_object_table)::int n from information_schema.triggers where trigger_schema='public'`,
);
check(
  `trigger'lı tablo sayısı (${trg.n}, ${expectedTriggerTables} bekleniyor: ` +
    `${frozenCount} dondurulan kural tablosu + ${literalTriggerCount} koruma)`,
  trg.n === expectedTriggerTables,
);

// ------------------------------------------------------------------ veri
console.log("\nSeed ve proje CRUD…");
await db.exec(`
  INSERT INTO "organization"(id,name,"createdAt","updatedAt") VALUES ('org1','Datum',now(),now());
  INSERT INTO "region_package"(id,"organizationId",name,country,"adminUnit","createdAt","updatedAt")
    VALUES ('pkg1','org1','Pilot','TR','Istanbul',now(),now());
  INSERT INTO "region_package_version"(id,"regionPackageId",version,"effectiveFrom",status,"createdAt","updatedAt")
    VALUES ('v1','pkg1','2026.1','2026-01-01','draft',now(),now());
`);
check("organizasyon + paket + draft sürüm", true);

await db.exec(`
  INSERT INTO "project"(id,"organizationId",name,"projectType",status,tier,"createdAt","updatedAt")
    VALUES ('p1','org1','Test Projesi','yeniYapi','taslak','K1',now(),now());
`);
const proj = await one(`select count(*)::int n from "project" where id='p1'`);
check("boş proje açılabiliyor (regionPackageVersionId NULL)", proj.n === 1);

// --------------------------------------------------- draft'a bağlanma reddi
console.log("\nBağlanma ve dondurma…");
await expectError(
  db,
  `UPDATE "project" SET "regionPackageVersionId"='v1' WHERE id='p1'`,
  "DATUM_NOT_PUBLISHED",
  "draft sürüme bağlanma REDDEDİLİYOR",
);

// yayımla, sonra bağlan
await db.exec(
  `UPDATE "region_package_version" SET status='published', "publishedAt"=now() WHERE id='v1'`,
);
await db.exec(`UPDATE "project" SET "regionPackageVersionId"='v1' WHERE id='p1'`);
const bound = await one(`select "regionPackageVersionId" v from "project" where id='p1'`);
check("yayımlanmış sürüme bağlanıyor, sürüm donuyor", bound.v === "v1");

// ------------------------------------------------------------- değişmezlik
console.log("\nDeğişmezlik (ilke 2)…");
await expectError(
  db,
  `INSERT INTO "space_shape_factor_rule"(id,"regionPackageVersionId","ruleKey","spaceType","shapeFactor")
     VALUES ('r1','v1','salon','salon',4.2)`,
  "DATUM_FROZEN",
  "yayımlanmış sürüme kural EKLENEMİYOR",
);

// draft sürümde kural yazılabilmeli
await db.exec(`
  INSERT INTO "region_package_version"(id,"regionPackageId",version,"effectiveFrom",status,"createdAt","updatedAt")
    VALUES ('v2','pkg1','2026.2','2026-06-01','draft',now(),now());
  INSERT INTO "space_shape_factor_rule"(id,"regionPackageVersionId","ruleKey","spaceType","shapeFactor")
    VALUES ('r2','v2','salon','salon',4.2);
`);
check("draft sürümde kural yazılabiliyor", true);

await db.exec(`UPDATE "space_shape_factor_rule" SET "shapeFactor"=4.3 WHERE id='r2'`);
check("draft sürümde kural güncellenebiliyor", true);

await db.exec(`UPDATE "region_package_version" SET status='published', "publishedAt"=now() WHERE id='v2'`);
await expectError(
  db,
  `UPDATE "space_shape_factor_rule" SET "shapeFactor"=9.9 WHERE id='r2'`,
  "DATUM_FROZEN",
  "yayımdan sonra kural DEĞİŞTİRİLEMİYOR",
);
await expectError(
  db,
  `DELETE FROM "space_shape_factor_rule" WHERE id='r2'`,
  "DATUM_FROZEN",
  "yayımdan sonra kural SİLİNEMİYOR",
);
await expectError(
  db,
  `UPDATE "region_package_version" SET version='hack' WHERE id='v2'`,
  "DATUM_FROZEN",
  "yayımlanmış sürümün içeriği değiştirilemiyor",
);

// ------------------------------------------------ geriye dönük etkisizlik
console.log("\nGeriye dönük etkisizlik (ilke 2'nin asıl testi)…");
const before = await one(`select "shapeFactor"::text s from "space_shape_factor_rule" where id='r2'`);
await db.exec(`
  INSERT INTO "region_package_version"(id,"regionPackageId",version,"effectiveFrom",status,"createdAt","updatedAt")
    VALUES ('v3','pkg1','2026.3','2026-09-01','draft',now(),now());
  INSERT INTO "space_shape_factor_rule"(id,"regionPackageVersionId","ruleKey","spaceType","shapeFactor")
    VALUES ('r3','v3','salon','salon',5.5);
  UPDATE "region_package_version" SET status='published', "publishedAt"=now() WHERE id='v3';
`);
const after = await one(`select "shapeFactor"::text s from "space_shape_factor_rule" where id='r2'`);
check(
  `yeni sürüm eski sürümün değerini DEĞİŞTİRMİYOR (${before.s} → ${after.s})`,
  before.s === after.s,
);

// ------------------------------------------------------------- set-once
console.log("\nSet-once…");
await expectError(
  db,
  `UPDATE "project" SET "regionPackageVersionId"='v3' WHERE id='p1'`,
  "DATUM_SET_ONCE",
  "migration kaydı olmadan sürüm değiştirilemiyor",
);

await db.exec(`
  INSERT INTO "project_package_migration"(id,"projectId","fromVersionId","toVersionId",status,"createdAt")
    VALUES ('m1','p1','v1','v3','applied',now());
  UPDATE "project" SET "regionPackageVersionId"='v3' WHERE id='p1';
`);
const migrated = await one(`select "regionPackageVersionId" v from "project" where id='p1'`);
check("`applied` migration kaydıyla sürüm değişebiliyor", migrated.v === "v3");

// --------------------------------------------------------- ezme mekanizması
console.log("\nHesaplanan değer ve ezme (ilke 5)…");
await db.exec(`
  INSERT INTO "block"(id,"projectId","isDefault",name,"sortOrder","createdAt","updatedAt")
    VALUES ('b1','p1',true,NULL,0,now(),now());
  INSERT INTO "floor"(id,"blockId","floorNo","floorType","isLocked","hasCommercial","createdAt","updatedAt")
    VALUES ('f1','b1',1,'normal',false,false,now(),now());
  INSERT INTO "unit"(id,"floorId","isDuplex","netAreaComputedValue","createdAt","updatedAt")
    VALUES ('u1','f1',false,119.500,now(),now());
`);
let u = await one(`select "netArea"::text a from "unit" where id='u1'`);
check(`computedValue generated kolona yansıyor (${u.a})`, Number(u.a) === 119.5);

await db.exec(
  `UPDATE "unit" SET "netAreaOverrideValue"=125.000, "netAreaOverrideReason"='Ölçüm düzeltmesi' WHERE id='u1'`,
);
u = await one(`select "netArea"::text a from "unit" where id='u1'`);
check(`overrideValue computedValue'yu eziyor (${u.a})`, Number(u.a) === 125);

// Postgres generated kolona yazmayı reddeder:
// «column "netArea" can only be updated to DEFAULT»
await expectError(
  db,
  `UPDATE "unit" SET "netArea"=999 WHERE id='u1'`,
  "can only be updated to DEFAULT",
  "GENERATED kolona YAZILAMIYOR",
);

const ledger = await db.query(
  `select "entityType","fieldKey","overrideReason","projectId" from "OverrideLedger" where "projectId"='p1'`,
);
check(
  `OverrideLedger ezmeyi listeliyor (${ledger.rows.length} satır)`,
  ledger.rows.length === 1 &&
    ledger.rows[0].entityType === "Unit" &&
    ledger.rows[0].fieldKey === "netArea",
);

// ------------------------------------------------- fiyat kütüphanesi stub'ı
console.log("\nFiyat kütüphanesi sürümü (İP-6 stub'ı)…");
await db.exec(`
  INSERT INTO "price_list_version"(id,"organizationId","status","createdAt","updatedAt")
    VALUES ('pl1','org1','draft',now(),now());
  UPDATE "project" SET "priceListVersionId"='pl1' WHERE id='p1';
`);
const priced = await one(`select "priceListVersionId" v from "project" where id='p1'`);
check("proje fiyat kütüphanesi sürümüne bağlanabiliyor", priced.v === "pl1");

await expectError(
  db,
  `DELETE FROM "price_list_version" WHERE id='pl1'`,
  "violates RESTRICT setting",
  "bağlı fiyat sürümü SİLİNEMİYOR (onDelete: Restrict)",
);

// ---------------------------------------------------------------- özet
console.log(`\n${pass} geçti, ${fail} başarısız.`);
process.exit(fail === 0 ? 0 : 1);
