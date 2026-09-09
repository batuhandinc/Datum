import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseAllAnnotations, isVisibleAtTier } from "../prisma/codegen/parse-schema";
import { FIELD_CATALOG, fieldsForTier, catalogEntry } from "@/lib/fields/generated";

/**
 * KADEME KATALOĞU ve `@src` ÇAPALARI.
 *
 * İP-1 şemaya `/// @tier @own @src` açıklamaları yazdı ama hiçbir kod
 * okumuyordu — ölü metadata'ydı. İP-2 onları sihirbazın alan görünürlüğüne
 * bağlıyor; bu testler bağın sağlam kaldığını doğruluyor.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const annotations = parseAllAnnotations(path.join(ROOT, "prisma", "schema"));

// ---------------------------------------------------------------- @src

/**
 * Dokümanı bölümlere böler.
 *
 * İki biçim var: veri modeli `## 3. Proje ve Parsel`, süreç modeli
 * `### A4 — Hak Sahibi Analizi`. İkisi de anlamsal ve kaymaz.
 */
function sectionsOf(file: string): Map<string, string> {
  const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
  const out = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of lines) {
    const m = /^##\s+(\d+)\./.exec(line) ?? /^###\s+(A\d+)\s/.exec(line);
    if (m) current = m[1]!;
    if (current) {
      const list = out.get(current) ?? [];
      list.push(line);
      out.set(current, list);
    }
  }
  return new Map([...out].map(([k, v]) => [k, v.join("\n").toLowerCase()]));
}

const docCache = new Map<string, Map<string, string>>();
const getSections = (file: string) => {
  if (!docCache.has(file)) docCache.set(file, sectionsOf(file));
  return docCache.get(file)!;
};

const baseName = (f: string) =>
  f.replace(/(ComputedValue|OverrideValue|OverrideReason)$/, "");

describe("@src çapaları", () => {
  const withSrc = annotations.filter((a) => a.src !== null);

  it("hepsi BÖLÜM biçiminde (satır numarası DEĞİL)", () => {
    // Satır numarası kırılgandır: dokümana bir paragraf eklemek yüzlerce
    // referansı birden bozar. v1.1 ve v1.2'de tam olarak bu oldu.
    const lineRefs = withSrc.filter((a) => /:\d+$/.test(a.src!));
    expect(lineRefs.map((a) => `${a.model}.${a.field} → ${a.src}`)).toEqual([]);
  });

  it("referans verilen bölüm dokümanda VAR", () => {
    const missing: string[] = [];
    for (const a of withSrc) {
      const [file, section] = a.src!.split("§");
      if (!file || !section) continue;
      if (!getSections(file).has(section)) missing.push(`${a.model}.${a.field} → ${a.src}`);
    }
    expect(missing).toEqual([]);
  });

  it("alan, referans verilen bölümde GERÇEKTEN geçiyor", () => {
    // Kural tablolarının alan adları dokümanda yok (kayıtlı sapma: doküman
    // bölüm 12 içeriği Türkçe tarif ediyor, alan adı vermiyor). Onlar hariç.
    const RULE_TABLE_SECTION = "12";

    const orphans: string[] = [];
    for (const a of withSrc) {
      const [file, section] = a.src!.split("§");
      if (!file || !section || section === RULE_TABLE_SECTION) continue;

      const text = getSections(file).get(section);
      if (!text) continue;

      const name = baseName(a.field).toLowerCase();
      if (text.includes(name)) continue;

      // Genişletilmiş adlar: "existingBuildingFloors" ← "…Age / floors / unitCount"
      const segs = baseName(a.field)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .toLowerCase()
        .split(/\s+/)
        .filter((s) => s.length >= 4);
      if (segs.length > 1 && segs.every((s) => text.includes(s))) continue;

      orphans.push(`${a.model}.${a.field} → ${a.src}`);
    }

    // Bir alan referans verdiği bölümde geçmiyorsa ya çapa yanlış ya alan
    // uydurulmuş. İkisi de sessizce kalmamalı — sayı sabitlenerek büyümesi engellenir.
    expect(orphans.length, `Bölümünde bulunamayan alanlar:\n${orphans.join("\n")}`).toBeLessThanOrEqual(
      8,
    );
  });
});

// ------------------------------------------------------------ kademe kataloğu

describe("kademe kataloğu", () => {
  it("A1–A4 varlıklarının hepsi katalogda", () => {
    // İP-2'nin formları bunlara dayanıyor; biri eksikse form boş açılır.
    for (const model of ["Parcel", "ZoningData", "SoilData", "SiteData", "Stakeholder"]) {
      expect(Object.keys(FIELD_CATALOG), `${model} katalogda yok`).toContain(model);
    }
  });

  it("görünürlük KÜMÜLATİF — K2 projesinde K1 ∪ K2 görünür", () => {
    const k1 = fieldsForTier("ZoningData", "K1");
    const k2 = fieldsForTier("ZoningData", "K2");
    const k3 = fieldsForTier("ZoningData", "K3");

    expect(k1.length).toBeGreaterThan(0);
    expect(k2.length).toBeGreaterThan(k1.length);
    expect(k3.length).toBeGreaterThanOrEqual(k2.length);

    // K1 alanları K2'de de görünmeli
    for (const f of k1) expect(k2).toContain(f);
  });

  it("hesaplanan alanlar sihirbaz GİRDİSİ değil", () => {
    // ZoningData'nın dört hesaplanan alanı katalogda OLMAMALI: onlar sonuç
    // panelinde gösterilir, form girdisi olarak değil.
    for (const f of [
      "maxFootprint",
      "maxTotalFloorArea",
      "buildableEnvelope",
      "basementGainFromLevelDifference",
    ]) {
      expect(catalogEntry("ZoningData", f), `${f} girdi olarak görünmemeli`).toBeNull();
      expect(catalogEntry("ZoningData", `${f}ComputedValue`)).toBeNull();
    }
  });

  it("L0'ın girdileri doğru kademelerde", () => {
    // K1 skaler hesabın girdileri K1 olmalı — aksi halde K1'de zarf hesaplanamaz.
    expect(catalogEntry("ZoningData", "groundCoverageRatio")?.tier).toBe("K1");
    expect(catalogEntry("ZoningData", "floorAreaRatio")?.tier).toBe("K1");
    expect(catalogEntry("ZoningData", "setbackFront")?.tier).toBe("K1");
    expect(catalogEntry("Parcel", "area")?.tier).toBe("K1");

    // Poligon K2 — bu yüzden L0'ın iki modu var.
    expect(catalogEntry("Parcel", "geometry")?.tier).toBe("K2");
    // roadFrontages de K2: kenar bazlı öteleme ancak poligonla anlamlı.
    expect(catalogEntry("ZoningData", "roadFrontages")?.tier).toBe("K2");
  });

  it("A3 ve A4'ün K1 alanı YOK — K1'de bu ekranlar boş açılır", () => {
    // Süreç modeli A3 ve A4 tablolarında tek bir K1 satırı bile yok.
    // Kademe filtresi bu iki ekranı K1'de kendiliğinden boşaltıyor.
    expect(fieldsForTier("SoilData", "K1")).toEqual([]);
    expect(fieldsForTier("SiteData", "K1")).toEqual([]);
    expect(fieldsForTier("Stakeholder", "K1")).toEqual([]);

    // K2'de dolmalılar
    expect(fieldsForTier("SoilData", "K2").length).toBeGreaterThan(0);
    expect(fieldsForTier("Stakeholder", "K2").length).toBeGreaterThan(0);
  });

  it("isVisibleAtTier sözleşmesi", () => {
    expect(isVisibleAtTier("K1", "K1")).toBe(true);
    expect(isVisibleAtTier("K1", "K3")).toBe(true);
    expect(isVisibleAtTier("K3", "K1")).toBe(false);
    // Kademesiz alan hiçbir kademede GİRDİ değildir
    expect(isVisibleAtTier(null, "K3")).toBe(false);
  });
});

describe("ayrıştırıcı anomalileri", () => {
  it("bir açıklama bloğu birden çok ardışık alanı kapsıyor", () => {
    // Parcel'de tek `///` bloğu üç alanı kapsıyor.
    for (const f of ["existingBuildingAge", "existingBuildingFloors", "existingBuildingUnitCount"]) {
      expect(catalogEntry("Parcel", f)?.tier, `${f} kademesiz kaldı`).toBe("K1");
    }
    // ZoningData'da çekme mesafeleri de öyle.
    for (const f of ["setbackFront", "setbackSide", "setbackRear"]) {
      expect(catalogEntry("ZoningData", f)?.tier).toBe("K1");
    }
  });

  it("literal em-dash kademe `unspecified` sayılıyor, katalog dışında", () => {
    // Project.notes'un kademe hücresi dokümanda literal "—".
    expect(catalogEntry("Project", "notes")).toBeNull();
  });

  it("pile* alanları v1.2'de ayrıştırıldı", () => {
    expect(catalogEntry("SoilData", "pileRequired")?.tier).toBe("K2");
    expect(catalogEntry("SoilData", "pileCount")?.tier).toBe("K3");
  });
});
