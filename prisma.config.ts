import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma config kullanıldığında CLI .env'i KENDİLİĞİNDEN yüklemez.
// DATABASE_URL datasource tarafından okunduğu için burada elle yükleniyor.
import "dotenv/config";

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
