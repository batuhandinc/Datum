import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { VERSION_SCOPED_MODELS } from "@/lib/region-package/version";

/**
 * MİMARİ KURALLARIN TESTİ.
 *
 * Bunlar yorum olarak yazılsa unutulurdu; test olarak yazılınca ihlal
 * derlemede değil ama CI'da yüksek sesle patlar.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const sourceFiles = walk(SRC).map((file) => ({
  file,
  relative: path.relative(ROOT, file).replace(/\\/g, "/"),
  text: readFileSync(file, "utf8"),
}));

describe("kural tablolarına erişim", () => {
  /**
   * Kural tabloları `ORG_SCOPED_MODELS` içinde DEĞİLDİR: doğrudan sorgu
   * kiracı filtresinden geçmez. Dahası sürüm filtresini unutan bir sorgu
   * YANLIŞ PAKETİ okur ve makul görünen, sessizce yanlış bir sayı üretir.
   *
   * Tek meşru yol: `src/lib/rules/reader.ts`.
   */
  const ALLOWED = ["src/lib/rules/reader.ts", "src/lib/region-package/version.ts"];

  it.each(VERSION_SCOPED_MODELS)("%s yalnızca okuyucu üzerinden okunuyor", (model) => {
    const offenders = sourceFiles
      .filter((f) => !ALLOWED.includes(f.relative))
      .filter((f) => new RegExp(`\\b(prisma|tx|db\\(\\))\\.${model}\\b`).test(f.text))
      .map((f) => f.relative);

    expect(
      offenders,
      `${model} doğrudan okunuyor. Kural okumaları createRuleReader() üzerinden yapılmalı — ` +
        `sürüm filtresini unutan bir sorgu yanlış paketi okur (ilke 2).`,
    ).toEqual([]);
  });
});

describe("kiracılık", () => {
  it("ham `prisma` kullanan her modül kiracılığı AÇIKÇA kuruyor", () => {
    /**
     * Ham istemci kiracı filtresinden geçmez. Ama bazı modüller onu meşru
     * biçimde kullanır: transaction açanlar, enjekte edilen istemciyle
     * çalışanlar. Onlardan istenen, kapsamı KENDİLERİNİN kurmasıdır.
     *
     * Kural bir izin listesi DEĞİL — izin listesi sessizce büyür ve anlamını
     * yitirir. Kural şu: ham `prisma` içeren bir dosya, `scopedPrisma` veya
     * `currentOrganizationId` de içermelidir. Böylece yeni bir dosya eklendiğinde
     * ya kapsamı kurar ya da test patlar.
     */
    const INFRASTRUCTURE = ["src/lib/db/client.ts", "src/lib/db/tenant.ts"];

    const offenders = sourceFiles
      .filter((f) => !INFRASTRUCTURE.includes(f.relative))
      .filter((f) => /from "@\/lib\/db\/client"/.test(f.text))
      .filter((f) => /\bprisma\b/.test(f.text))
      .filter((f) => !/\b(scopedPrisma|currentOrganizationId)\b/.test(f.text))
      .map((f) => f.relative);

    expect(
      offenders,
      "Ham prisma kullanan modül kapsamı kendisi kurmalı (scopedPrisma / currentOrganizationId) — aksi halde kiracı sızar.",
    ).toEqual([]);
  });
});

describe("i18n — koda gömülü Türkçe metin yok", () => {
  /**
   * Arayüz metinleri yalnızca i18n katmanında. Bu test JSX metin düğümlerinde
   * ve string literal'lerinde Türkçe'ye özgü karakter arar.
   *
   * Yorumlar ve `///` açıklamaları Türkçedir ve HARİÇTİR — konvansiyon
   * "yorumlar Türkçe, arayüz metni i18n'de" diyor.
   */
  const TURKISH_CHARS = /[çğıöşüÇĞİÖŞÜ]/;

  const stripComments = (text: string): string =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .join("\n");

  it("src/app altında Türkçe string literal yok", () => {
    const appFiles = sourceFiles.filter((f) => f.relative.startsWith("src/app/"));
    expect(appFiles.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const f of appFiles) {
      const code = stripComments(f.text);
      for (const m of code.matchAll(/(["'])((?:[^\\\n]|\\.)*?)\1/g)) {
        const literal = m[2] ?? "";
        if (TURKISH_CHARS.test(literal)) offenders.push(`${f.relative}: "${literal}"`);
      }
    }

    expect(offenders, "Arayüz metni src/lib/i18n/tr.ts içinde olmalı.").toEqual([]);
  });
});
