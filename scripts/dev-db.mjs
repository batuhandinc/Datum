/**
 * YEREL GELİŞTİRME VERİTABANI — Docker gerektirmez.
 *
 * PGlite (süreç içi WASM Postgres) bir TCP soketi üzerinden Postgres TEL
 * PROTOKOLÜ ile sunulur. Uygulama, Prisma CLI ve Prisma Studio bunu sıradan
 * bir Postgres sunucusu olarak görür — .env değişmez, uygulama kodu değişmez.
 *
 *   node scripts/dev-db.mjs        (veya: npm run db:local)
 *
 * Testlerdeki `tests/helpers/db.ts` PGlite'ı SÜREÇ İÇİNDE kullanır; oradaki
 * veritabanı belleğe kurulur ve test bitince kaybolur. Dev sunucusu ayrı bir
 * süreç olduğu için onu göremez — bu script aradaki farkı kapatır ve veriyi
 * diske yazar, böylece sunucu yeniden başlayınca projeler durur.
 *
 * GERÇEK POSTGRES'İN YERİNİ TUTMAZ: uzantı, eşzamanlılık ve rol davranışı
 * farklıdır ve kimlik doğrulaması YOKTUR (yalnızca 127.0.0.1'e bağlanır).
 * Yalnızca yerel geliştirme ve elle test içindir; migration ÜRETİMİ hâlâ
 * gerçek Postgres ister.
 */

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS = path.join(ROOT, "prisma", "migrations");
const DATA_DIR = process.env.DATUM_LOCAL_DB_DIR ?? path.join(ROOT, ".pglite", "dev");
const PORT = Number(process.env.DATUM_LOCAL_DB_PORT ?? 5432);

/**
 * Migration'lar Prisma Migrate ile değil, ham SQL olarak uygulanır —
 * generated kolonlar ve plpgsql trigger'ları böyle çalışır ve
 * `pglite-prisma-adapter` zaten `migrate deploy` desteklemiyor.
 * Uygulananlar kendi işaret tablomuzda tutulur; `_prisma_migrations`
 * TAŞINMAZ, çünkü bu veritabanı Prisma Migrate tarafından yönetilmiyor.
 */
const MARKER_TABLE = "_datum_local_migrations";

async function applyMigrations(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS "${MARKER_TABLE}" (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await db.query(`SELECT name FROM "${MARKER_TABLE}"`)).rows.map((r) => r.name),
  );

  const dirs = readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  let count = 0;
  for (const dir of dirs) {
    if (applied.has(dir)) continue;
    const sql = readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8");
    try {
      await db.exec(sql);
    } catch (e) {
      console.error(`\n  ✗ migration ${dir}\n    ${e.message}\n`);
      process.exit(1);
    }
    await db.query(`INSERT INTO "${MARKER_TABLE}" (name) VALUES ($1)`, [dir]);
    console.log(`  ✓ migration ${dir}`);
    count++;
  }
  return { count, total: dirs.length };
}

// PGlite'ın nodefs katmanı dizini İÇ İÇE oluşturmuyor (tek seviyeli mkdir).
mkdirSync(DATA_DIR, { recursive: true });

const db = new PGlite(DATA_DIR);
await db.waitReady;

const { count, total } = await applyMigrations(db);
console.log(
  count === 0
    ? `  · ${total} migration zaten uygulanmış`
    : `  · ${count}/${total} migration uygulandı`,
);

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: "127.0.0.1",
  // Prisma bir bağlantı HAVUZU açar. Sorgular kütüphane içinde sıraya
  // alınır (PGlite tek bağlantılıdır), ama havuzun tüm soketleri kabul
  // edilmezse Prisma bağlanırken kilitlenir.
  maxConnections: 20,
});

await server.start();

console.log(`
  Datum yerel veritabanı hazır.

    postgresql://datum:datum@127.0.0.1:${PORT}/datum?schema=public&pgbouncer=true&connection_limit=1
    veri dizini: ${path.relative(ROOT, DATA_DIR)}

  pgbouncer=true ZORUNLU — PGlite tek oturumdur ve bu sunucu tüm bağlantıları
  onun üzerine çoğullar; adsız hazır ifade olmadan ikinci süreç
  "prepared statement s0 already exists" ile patlar.

  Bu sunucu AÇIK KALMALI. Başka bir terminalde:

    npm run db:seed       tek organizasyon + boş draft paket
    npm run db:fixture    SENTETİK test paketi (gerçek mevzuat DEĞİL)
    npm run dev           uygulama

  Durdurmak için Ctrl+C.
`);

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await server.stop();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
