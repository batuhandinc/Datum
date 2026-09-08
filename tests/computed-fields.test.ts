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

  it("52 hesaplanan alan, 18 model, 208 kolon", () => {
    expect(allComputedFields()).toHaveLength(52);
    expect(COMPUTED_MODELS).toHaveLength(18);
    expect(allComputedFields().length * 4).toBe(208);
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

  it("trigger listesi ile kod listesi birebir aynı", () => {
    // prisma/sql/immutability.sql'deki frozen_tables dizisi ile
    // VERSION_SCOPED_MODELS aynı kümeyi göstermeli. Biri unutulursa
    // o tablo dondurulmamış olur — ilke 2 sessizce delinir.
    const sql = readFileSync(path.join(ROOT, "prisma", "sql", "immutability.sql"), "utf8");
    const block = /frozen_tables text\[\] := ARRAY\[([\s\S]*?)\];/.exec(sql);
    expect(block).not.toBeNull();
    const tables = [...block![1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);

    const expected = VERSION_SCOPED_MODELS.map((m) =>
      m.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
    );

    expect(tables.sort()).toEqual([...expected].sort());
  });
});

describe("kiracılık", () => {
  it("organizationId YALNIZCA kök varlıklarda", () => {
    const models = [...schema.matchAll(/\bmodel\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];
    const carriers = models
      .filter(([, , body]) => hasField(body!, "organizationId"))
      .map(([, name]) => name!);

    expect(carriers.sort()).toEqual(["Project", "RegionPackage"]);
  });
});
