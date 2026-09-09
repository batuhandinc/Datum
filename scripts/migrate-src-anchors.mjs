/**
 * TEK SEFERLİK GÖÇ: `@src dosya:satır` → `@src dosya§bölüm`
 *
 * Satır numaraları KALICI OLARAK KIRILGANDIR: dokümanın başına bir paragraf
 * eklemek 500 referansı birden bozar. Nitekim bozdu — v1.1 ve v1.2
 * düzenlemelerinden sonra 539 referansın 495'i yanlış satıra bakıyordu.
 *
 * Bölüm numarası ise ANLAMSALDIR: doküman içine metin eklemek onu kaydırmaz.
 * Bir test, alanın referans verilen bölümde gerçekten geçtiğini doğrular —
 * böylece referans hem kalıcı hem denetlenebilir olur.
 *
 *   node scripts/migrate-src-anchors.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "prisma", "schema");
const DOC = "etut-veri-modeli.md";
const dry = process.argv.includes("--dry");

// --------------------------------------------------------- dokümanı bölümle
const docLines = readFileSync(path.join(ROOT, DOC), "utf8").split("\n");

/** Her satır için hangi `## N.` bölümünde olduğunu tutar. */
const sectionOfLine = [];
let current = null;
for (const line of docLines) {
  const m = /^##\s+(\d+)\./.exec(line);
  if (m) current = m[1];
  sectionOfLine.push(current);
}

const segments = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter((s) => s.length >= 4);

/**
 * Hesaplanan alan üçlüsünün sonekleri dokümanda GEÇMEZ: doküman `netArea`
 * der, `netAreaComputedValue` demez. Taban adı ararız.
 */
function baseFieldName(field) {
  return field.replace(/(ComputedValue|OverrideValue|OverrideReason)$/, "");
}

/**
 * Her modelin dokümandaki bölümü.
 *
 * BU HARİTA ZORUNLU. Küresel arama "makul ama YANLIŞ" çapa üretiyor:
 * `count`, `name`, `width`, `area` gibi genel adlar dokümanda ilk olarak
 * bölüm 3'te geçiyor, dolayısıyla `Elevator.count` bölüm 3'e bağlanıyordu.
 * Açıkça yanlış bir çapa fark edilir; makul görünen yanlış çapa edilmez.
 */
const MODEL_SECTION = {
  // §3 Proje ve Parsel
  Project: "3", Parcel: "3", ZoningData: "3", SoilData: "3", SiteData: "3", Stakeholder: "3",
  // §4 Mekan modeli
  Space: "4", Opening: "4", Fixture: "4", SurfaceFinish: "4",
  // §5 Bağımsız bölüm ve kat
  Unit: "5", UnitType: "5", Floor: "5", Block: "5", FloorTemplate: "5", CommonSpace: "5",
  // §6 Çekirdek
  Core: "6", Elevator: "6", Stair: "6", Shaft: "6",
  // §7 Servis mekanları
  ServiceSpace: "7", Shelter: "7", ElectricalRoom: "7", WaterTank: "7",
  FireSystem: "7", Generator: "7", HeatingCenter: "7",
  // §8 Otopark
  ParkingLayout: "8", ParkingSpace: "8", Ramp: "8",
  // §9 Cephe, çatı, peyzaj
  Facade: "9", FacadeMaterial: "9", Roof: "9", Landscape: "9",
  // §10 Metraj motoru
  ObjectCostMapping: "10", QuantityLine: "10", QuantityTakeoff: "10",
  StructuralCoefficientSet: "10",
  // §11 Spesifikasyon
  SpecificationPackage: "11", SpecificationSet: "11",
};

/** Bir bölümün satır aralığındaki eşleşmeyi arar. */
function matchesIn(name, sectionFilter) {
  const lower = name.toLowerCase();
  const segs = segments(name);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < docLines.length; i++) {
      const sec = sectionOfLine[i];
      if (sec === null) continue;
      if (sectionFilter && sec !== sectionFilter) continue;
      const l = docLines[i].toLowerCase();
      if (pass === 0 ? l.includes(lower) : segs.length > 1 && segs.every((s) => l.includes(s))) {
        return sec;
      }
    }
  }
  return null;
}

/**
 * Alanın çapası.
 *
 * ÖNCE modelin kendi bölümünde aranır; ancak orada bulunamazsa dokümanın
 * geneline bakılır. Bölüm numarası OLMAYAN satırlar her iki durumda da
 * atlanır: dokümanın başındaki değişiklik listesi alan adlarını anıyor ve
 * oraya çapa atmak anlamsız olurdu.
 */
function findSection(field, model) {
  const name = baseFieldName(field);
  const hint = model ? MODEL_SECTION[model] : null;

  if (hint) {
    const inModelSection = matchesIn(name, hint);
    if (inModelSection) return inModelSection;
  }

  const anywhere = matchesIn(name, null);
  if (anywhere) return anywhere;

  // Alan dokümanda hiç geçmiyor ama modelin bölümü belli: oraya bağla.
  // (Alan adı bizim önerimizdir — şema başlığındaki kayıtlı sapma.)
  return hint;
}

const FIELD_LINE = /^\s*([A-Za-z][A-Za-z0-9_]*)\s+([A-Za-z[\]?]+)/;

let rewritten = 0;
let unresolved = 0;
const unresolvedList = [];

for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".prisma"))) {
  const full = path.join(SCHEMA_DIR, file);
  const lines = readFileSync(full, "utf8").split("\n");

  let model = null;

  for (let i = 0; i < lines.length; i++) {
    const modelStart = /^model\s+([A-Za-z][A-Za-z0-9_]*)\s*\{/.exec(lines[i].trim());
    if (modelStart) model = modelStart[1];
    else if (lines[i].trim() === "}") model = null;

    const srcMatch = new RegExp(`@src\\s+${DOC}:(\\d+)`).exec(lines[i]);
    if (!srcMatch) continue;

    // Bu açıklamanın kapsadığı İLK alanı bul: sonraki `///` olmayan alan satırı.
    let field = null;
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t.startsWith("///")) continue;
      if (t === "" || t.startsWith("//") || t.startsWith("@@") || t === "}") break;
      const fm = FIELD_LINE.exec(lines[j]);
      if (fm) {
        field = fm[1];
        break;
      }
    }

    let section = field ? findSection(field, model) : null;

    // Kural tablolarının alan ADLARI dokümanda YOK — doküman bölüm 12 onların
    // içeriğini Türkçe tarif ediyor ama alan adı vermiyor (şema başlığındaki
    // kayıtlı sapma). Bu alanların doğru çapası bölüm 12'dir.
    if (!section && file === "10-region-package.prisma") section = "12";

    if (!section) {
      unresolved++;
      if (field) unresolvedList.push(`${file}: ${field}`);
      continue;
    }

    lines[i] = lines[i].replace(new RegExp(`@src\\s+${DOC}:\\d+`), `@src ${DOC}§${section}`);
    rewritten++;
  }

  if (!dry) writeFileSync(full, lines.join("\n"), "utf8");
}

console.log(`Yeniden yazılan: ${rewritten} · çözülemeyen: ${unresolved}`);
if (unresolvedList.length > 0) {
  console.log("\nDokümanda bulunamayan alanlar (@src olduğu gibi bırakıldı):");
  console.log(unresolvedList.map((s) => `  ${s}`).join("\n"));
}
if (dry) console.log("\n(--dry: dosyalar DEĞİŞTİRİLMEDİ)");
