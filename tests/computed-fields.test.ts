import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  COMPUTED_MODELS,
  allComputedFields,
  computedColumn,
  overrideColumn,
  reasonColumn,
  quadColumns,
} from "../prisma/computed-fields";
import { VERSION_SCOPED_MODELS } from "../src/lib/region-package/version";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCHEMA_DIR = path.join(ROOT, "prisma", "schema");

function readSchema(): string {
  return readdirSync(SCHEMA_DIR)
    .filter((f) => f.endsWith(".prisma"))
    .map((f) => readFileSync(path.join(SCHEMA_DIR, f), "utf8"))
    .join("\n");
}

/** Bir modelin gövdesini şemadan çeker. */
function modelBody(schema: string, model: string): string {
  const re = new RegExp(`\\bmodel\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const m = re.exec(schema);
  if (!m || m[1] === undefined) throw new Error(`model ${model} şemada bulunamadı`);
  return m[1];
}

/** Gövdede bir alanın TANIMLI olup olmadığı (yorum satırları hariç). */
function hasField(body: string, field: string): boolean {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("///"))
    .some((l) => new RegExp(`^${field}\\s+\\S`).test(l));
}

const schema = readSchema();

describe("hesaplanan alan kayıt defteri ↔ şema uyumu", () => {
  // Karar 4 / kural 4: "Bir test her hesaplanan alanın dört kolonunun da
  // var olduğunu doğrulasın."
  it.each(allComputedFields())(
    "$model.$field dört kolonun hepsini taşıyor",
    ({ model, field }) => {
      const body = modelBody(schema, model);
      for (const col of quadColumns(field)) {
        expect(hasField(body, col), `${model}.${col} şemada yok`).toBe(true);
      }
    },
  );

  it("adlandırma mekanik — üç sonek bölüm 1.3'ün sözcükleri", () => {
    expect(computedColumn("netArea")).toBe("netAreaComputedValue");
    expect(overrideColumn("netArea")).toBe("netAreaOverrideValue");
    expect(reasonColumn("netArea")).toBe("netAreaOverrideReason");
  });

  // Sayaç kasıtlı olarak SABİTTİR: kayıt defterine alan eklemek bu satırı
  // kırar ve dört adımlı ritüelin (şema · registry · codegen · migration)
  // atlanmadığını görmeye zorlar.
  // İP-3'te 52/18/208 → 61/20/244 · İP-4'te 61/20/244 → 74/24/296.
  it("74 hesaplanan alan, 24 model, 296 kolon", () => {
    expect(allComputedFields()).toHaveLength(74);
    expect(COMPUTED_MODELS).toHaveLength(24);
    expect(allComputedFields().length * 4).toBe(296);
  });

  it("para ve alan alanları Decimal — float yok (Karar 4 / kural 1)", () => {
    for (const f of allComputedFields()) {
      if (f.kind !== "decimal") continue;
      expect(f.sqlType, `${f.model}.${f.field}`).toMatch(/^numeric\(\d+,\d+\)$/);

      // Üçlünün üç kolonu da AYNI precision/scale olmalı; aksi halde
      // COALESCE sessizce genişletir.
      const body = modelBody(schema, f.model);
      const decl = body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => new RegExp(`^(${quadColumns(f.field).join("|")})\\s`).test(l));
      const precisions = decl.map((l) => /@db\.Decimal\((\d+),\s*(\d+)\)/.exec(l)?.[0] ?? null);
      const numeric = precisions.filter((p): p is string => p !== null);
      expect(new Set(numeric).size, `${f.model}.${f.field} precision tutarsız: ${numeric}`).toBe(1);
    }
  });

  it("türetmesi dokümanda verilmeyen alanlar kayıtlı bir BOŞLUKTUR", () => {
    // Bu bir hata değil; dokümanın eksiği. Sayısı sabitlenerek sessizce
    // büyümesi engellenir.
    const missing = allComputedFields().filter((f) => !f.derivationStated);
    expect(missing.map((f) => `${f.model}.${f.field}`).sort()).toEqual(
      [
        "Elevator.travelHeight",
        "Facade.grossArea",
        "Facade.height",
        "Facade.netArea",
        "FireSystem.sprinklerRequired",
        "Floor.grossArea",
        "Generator.capacityKVA",
        "ParkingLayout.markingLength",
        "Roof.coveringArea",
        "Roof.structureWeight",
        "Stair.railingLength",
        "Stair.totalStepCount",
        "Unit.balconyArea",
        "Unit.commonAreaShare",
        "Unit.grossArea",
        "WaterTank.waterproofingArea",
      ].sort(),
    );
  });
});

describe("bölge paketi sürüm kapsamı", () => {
  it("her sürüm-kapsamlı model regionPackageVersionId ve ruleKey taşıyor", () => {
    for (const m of VERSION_SCOPED_MODELS) {
      const model = m.charAt(0).toUpperCase() + m.slice(1);
      const body = modelBody(schema, model);
      expect(hasField(body, "regionPackageVersionId"), `${model}.regionPackageVersionId`).toBe(true);
      expect(hasField(body, "ruleKey"), `${model}.ruleKey`).toBe(true);
      expect(hasField(body, "rowHash"), `${model}.rowHash`).toBe(true);
    }
  });

  /** Bir dosyadaki `frozen_tables ARRAY[...]` bloğundan tablo adlarını çıkarır. */
  function frozenTablesIn(file: string): string[] {
    const sql = readFileSync(file, "utf8");
    const block = /frozen_tables text\[\] := ARRAY\[([\s\S]*?)\];/.exec(sql);
    if (!block?.[1]) throw new Error(`frozen_tables bloğu bulunamadı: ${file}`);
    return [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).sort();
  }

  const expectedTables = VERSION_SCOPED_MODELS.map((m) =>
    m.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
  ).sort();

  it("kaynak SQL ile kod listesi birebir aynı", () => {
    // Biri unutulursa o tablo dondurulmamış olur — ilke 2 SESSİZCE delinir.
    expect(frozenTablesIn(path.join(ROOT, "prisma", "sql", "immutability.sql"))).toEqual(
      expectedTables,
    );
  });

  it("trigger kuran HER migration aynı listeyi taşıyor", () => {
    // Liste artık üç yerde: kaynak SQL, TS sabiti ve trigger kuran migration'lar.
    // Migration'lar geçmişi temsil ettiği için EN SONUNCUSU güncel listeyi
    // taşımalıdır — veritabanının son hâli odur.
    const migrationsDir = path.join(ROOT, "prisma", "migrations");
    const withTriggers = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(migrationsDir, d.name, "migration.sql"))
      .filter((f) => readFileSync(f, "utf8").includes("frozen_tables text[] :="))
      .sort();

    expect(withTriggers.length).toBeGreaterThan(0);
    expect(frozenTablesIn(withTriggers[withTriggers.length - 1]!)).toEqual(expectedTables);
  });
});

describe("kiracılık", () => {
  it("organizationId YALNIZCA kök varlıklarda", () => {
    const models = [...schema.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
    const carriers = models
      .filter(([, , body]) => hasField(body!, "organizationId"))
      .map(([, name]) => name!);

    // Kök = bağımsız adreslenebilen ve kiracıya ait; Project üzerinden
    // erişilen hiçbir varlık bu alanı taşımaz.
    // PriceListVersion köktür: projeler ona işaret eder, o projeye değil.
    // UnitTypeTemplate (İP-4) aynı gerekçeyle köktür — tipoloji kütüphanesi
    // firmaya aittir, projeye değil; projeler ondan KOPYALAR.
    expect(carriers.sort()).toEqual([
      "PriceListVersion",
      "Project",
      "RegionPackage",
      "UnitTypeTemplate",
    ]);
  });

  it("kod ile şema aynı kök listesini gösteriyor", () => {
    const client = readFileSync(path.join(ROOT, "src", "lib", "db", "client.ts"), "utf8");
    const block = /ORG_SCOPED_MODELS = \[([\s\S]*?)\] as const/.exec(client);
    expect(block).not.toBeNull();
    const listed = [...block![1]!.matchAll(/"(\w+)"/g)].map((m) => m[1]!);

    const models = [...schema.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
    const carriers = models
      .filter(([, , body]) => hasField(body!, "organizationId"))
      .map(([, name]) => name!);

    // Biri unutulursa o tablo kiracı filtresinden KAÇAR.
    expect(listed.sort()).toEqual(carriers.sort());
  });
});
