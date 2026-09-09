import { describe, expect, it } from "vitest";
import { $Enums } from "@prisma/client";
import { tr, warningMessage } from "@/lib/i18n/tr";
import { WARNING_CODES, warn } from "@/lib/warnings";

/**
 * i18n SÖZLÜK KAPSAMI.
 *
 * Eksik bir etiket arayüzde sessizce `undefined` basar — patlamaz, fark
 * edilmez. Bu testler her enum değerinin ve her uyarı kodunun karşılığı
 * olduğunu kilitler.
 */

/** Arayüzde gösterilen enum'lar ve karşılık geldikleri sözlükler. */
const DICTIONARIES = [
  ["Tier", $Enums.Tier, tr.tier],
  ["ProjectType", $Enums.ProjectType, tr.projectType],
  ["ProjectStatus", $Enums.ProjectStatus, tr.projectStatus],
  ["OwnershipType", $Enums.OwnershipType, tr.ownershipType],
  ["StructuralAssessmentStatus", $Enums.StructuralAssessmentStatus, tr.structuralAssessmentStatus],
  ["BuildingOrder", $Enums.BuildingOrder, tr.buildingOrder],
  ["FarCalculationBasis", $Enums.FarCalculationBasis, tr.farCalculationBasis],
  ["LevelDataSource", $Enums.LevelDataSource, tr.levelDataSource],
  ["LiquefactionRisk", $Enums.LiquefactionRisk, tr.liquefactionRisk],
  ["FoundationType", $Enums.FoundationType, tr.foundationType],
  ["AgreementStance", $Enums.AgreementStance, tr.agreementStance],
  ["OffsetJoinType", $Enums.OffsetJoinType, tr.offsetJoinType],
  ["RegionPackageVersionStatus", $Enums.RegionPackageVersionStatus, tr.regionPackage.status],

  // --- İP-3 ---
  ["CoreStrategy", $Enums.CoreStrategy, tr.coreStrategy],
  ["FloorType", $Enums.FloorType, tr.floorType],
  ["UsageType", $Enums.UsageType, tr.usageType],
  ["HeatingSystemType", $Enums.HeatingSystemType, tr.heatingSystemType],
  ["GeneratorScope", $Enums.GeneratorScope, tr.generatorScope],
  ["RoofType", $Enums.RoofType, tr.roofType],
  ["SpecificationLevel", $Enums.SpecificationLevel, tr.specificationLevel],
  ["ServiceSpaceType", $Enums.ServiceSpaceType, tr.serviceSpaceType],
  ["ShaftType", $Enums.ShaftType, tr.shaftType],

  // --- İP-4 ---
  ["WallType", $Enums.WallType, tr.wallType],
] as const;

describe("enum sözlükleri", () => {
  it.each(DICTIONARIES)("%s tam kapsanıyor", (_name, prismaEnum, dictionary) => {
    const values = Object.values(prismaEnum as Record<string, string>).sort();
    const keys = Object.keys(dictionary as Record<string, string>).sort();
    expect(keys).toEqual(values);
  });

  it("hiçbir etiket boş değil", () => {
    for (const [name, , dictionary] of DICTIONARIES) {
      for (const [key, label] of Object.entries(dictionary as Record<string, string>)) {
        expect(label.trim().length, `${name}.${key} boş`).toBeGreaterThan(0);
      }
    }
  });
});

describe("uyarı mesajları", () => {
  it("her uyarı kodunun karşılığı var", () => {
    const missing = WARNING_CODES.filter((c) => !(c in tr.warnings));
    expect(missing).toEqual([]);
  });

  it("fazladan mesaj yok — silinmiş kod sözlükte kalmamalı", () => {
    const extra = Object.keys(tr.warnings).filter(
      (k) => !(WARNING_CODES as readonly string[]).includes(k),
    );
    expect(extra).toEqual([]);
  });

  it("parametreler yerleştiriliyor", () => {
    // errorMessage() bunu YAPAMIYOR (kodu sabit metne çeviriyor); uyarılar
    // sayı taşımak zorunda olduğu için ayrı bir fonksiyon gerekti.
    const message = warningMessage(
      warn("ENVELOPE_EXCEEDS_FOOTPRINT", { envelopeArea: 222, maxFootprint: 206.4 }),
    );
    expect(message).toContain("222");
    expect(message).toContain("206,4");
    expect(message).not.toContain("{");
  });

  it("ondalık ayracı virgül", () => {
    const message = warningMessage(warn("SHARES_DO_NOT_SUM", { total: 66.67 }));
    expect(message).toContain("66,67");
  });

  it("parametresiz uyarı olduğu gibi dönüyor", () => {
    const message = warningMessage(warn("PACKAGE_NOT_BOUND"));
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain("{");
  });

  it("eksik parametre yer tutucuyu BOZMADAN bırakıyor", () => {
    // Sessizce boş dize basmak, sayının kaybolduğunu gizlerdi.
    const message = warningMessage(warn("ENVELOPE_SPLIT"));
    expect(message).toContain("{parts}");
  });
});

describe("alan etiketleri", () => {
  it("A1–A4 ekranlarının etiket sözlükleri dolu", () => {
    for (const dict of [
      tr.parcel.fields,
      tr.zoning.fields,
      tr.soil.fields,
      tr.stakeholder.fields,
    ]) {
      expect(Object.keys(dict).length).toBeGreaterThan(5);
      for (const label of Object.values(dict)) {
        expect(label.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
