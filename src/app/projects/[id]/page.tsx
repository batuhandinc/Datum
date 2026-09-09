import { notFound } from "next/navigation";
import type { Tier } from "@prisma/client";
import { loadWizardData, computeMajority } from "@/lib/parcel/repository";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { createRuleReader } from "@/lib/rules/reader";
import { catalogEntry, type CatalogModel } from "@/lib/fields/generated";
import { tr, warningMessage } from "@/lib/i18n/tr";
import { partCount } from "@/lib/geometry";
import { WizardSection, WarningList, type FieldSpec } from "./wizard-form";
import {
  addStakeholderAction,
  saveParcelAction,
  saveSoilAction,
  saveZoningAction,
} from "./actions";

export const dynamic = "force-dynamic";

/** Enum sözlüğünü `<select>` seçeneklerine çevirir. */
const opts = (dict: Readonly<Record<string, string>>) =>
  Object.entries(dict).map(([value, label]) => ({ value, label }));

const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

interface Spec {
  name: string;
  label: string;
  kind: FieldSpec["kind"];
  value: string | boolean | null;
  options?: readonly { value: string; label: string }[];
}

/**
 * Kademe filtresi — İP-2'nin "kademeye göre alan gösterimi" maddesi.
 *
 * Alanın kademesi katalogdan gelir (şemadaki `/// @tier` açıklamalarından
 * üretilir). Kademesi projeninkinden YÜKSEK olan alan GİZLENİR; kademesi
 * olmayan alan zaten sihirbaz girdisi değildir.
 *
 * Görünürlük kapatılır ama VERİ SİLİNMEZ: kademe yükseltilince alan geri
 * gelir ve önceki değeri yerinde durur (etut-surec-modeli.md§2).
 */
function visibleFields(model: CatalogModel, tier: Tier, specs: readonly Spec[]): FieldSpec[] {
  const order: Record<Tier, number> = { K1: 1, K2: 2, K3: 3 };
  return specs.flatMap((s) => {
    const entry = catalogEntry(model, s.name);
    if (!entry) return [];
    if (order[entry.tier] > order[tier]) return [];
    return [{ ...s, tier: entry.tier }];
  });
}

export default async function WizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let project: Awaited<ReturnType<typeof loadWizardData>>;
  try {
    project = await loadWizardData(id);
  } catch {
    notFound();
  }

  const [l0, majority, reader] = await Promise.all([
    computeAndStoreL0(id),
    computeMajority(id),
    createRuleReader(id),
  ]);
  const heightReferences = await reader.heightReferences();

  const parcel = project.parcel;
  const zoning = parcel?.zoningData ?? null;
  const soil = parcel?.soilData ?? null;
  const site = parcel?.siteData ?? null;
  const tier = project.tier;

  // ------------------------------------------------------------------ A1
  const parcelFields = visibleFields("Parcel", tier, [
    { name: "province", label: tr.parcel.fields.province, kind: "text", value: str(parcel?.province) },
    { name: "district", label: tr.parcel.fields.district, kind: "text", value: str(parcel?.district) },
    { name: "neighborhood", label: tr.parcel.fields.neighborhood, kind: "text", value: str(parcel?.neighborhood) },
    { name: "block", label: tr.parcel.fields.block, kind: "text", value: str(parcel?.block) },
    { name: "parcelNo", label: tr.parcel.fields.parcelNo, kind: "text", value: str(parcel?.parcelNo) },
    { name: "sheetNo", label: tr.parcel.fields.sheetNo, kind: "text", value: str(parcel?.sheetNo) },
    { name: "area", label: tr.parcel.fields.area, kind: "number", value: str(parcel?.area) },
    { name: "ownershipType", label: tr.parcel.fields.ownershipType, kind: "select", value: str(parcel?.ownershipType), options: opts(tr.ownershipType) },
    { name: "ownerCount", label: tr.parcel.fields.ownerCount, kind: "number", value: str(parcel?.ownerCount) },
    { name: "hasExistingBuilding", label: tr.parcel.fields.hasExistingBuilding, kind: "checkbox", value: parcel?.hasExistingBuilding ?? false },
    { name: "existingBuildingAge", label: tr.parcel.fields.existingBuildingAge, kind: "number", value: str(parcel?.existingBuildingAge) },
    { name: "existingBuildingFloors", label: tr.parcel.fields.existingBuildingFloors, kind: "number", value: str(parcel?.existingBuildingFloors) },
    { name: "existingBuildingUnitCount", label: tr.parcel.fields.existingBuildingUnitCount, kind: "number", value: str(parcel?.existingBuildingUnitCount) },
    { name: "existingTotalArea", label: tr.parcel.fields.existingTotalArea, kind: "number", value: str(parcel?.existingTotalArea) },
    { name: "demolitionRequired", label: tr.parcel.fields.demolitionRequired, kind: "checkbox", value: parcel?.demolitionRequired ?? false },
    { name: "structuralAssessmentStatus", label: tr.parcel.fields.structuralAssessmentStatus, kind: "select", value: str(parcel?.structuralAssessmentStatus), options: opts(tr.structuralAssessmentStatus) },
  ]);

  // ------------------------------------------------------------------ A2
  const zoningFields = visibleFields("ZoningData", tier, [
    { name: "buildingOrder", label: tr.zoning.fields.buildingOrder, kind: "select", value: str(zoning?.buildingOrder), options: opts(tr.buildingOrder) },
    { name: "groundCoverageRatio", label: tr.zoning.fields.groundCoverageRatio, kind: "number", value: str(zoning?.groundCoverageRatio) },
    { name: "floorAreaRatio", label: tr.zoning.fields.floorAreaRatio, kind: "number", value: str(zoning?.floorAreaRatio) },
    { name: "setbackFront", label: tr.zoning.fields.setbackFront, kind: "number", value: str(zoning?.setbackFront) },
    { name: "setbackSide", label: tr.zoning.fields.setbackSide, kind: "number", value: str(zoning?.setbackSide) },
    { name: "setbackRear", label: tr.zoning.fields.setbackRear, kind: "number", value: str(zoning?.setbackRear) },
    { name: "maxFloorCount", label: tr.zoning.fields.maxFloorCount, kind: "number", value: str(zoning?.maxFloorCount) },
    { name: "maxHeight", label: tr.zoning.fields.maxHeight, kind: "number", value: str(zoning?.maxHeight) },
    {
      name: "heightReferenceRuleKey",
      label: tr.zoning.fields.heightReferenceRuleKey,
      kind: "select",
      value: str(zoning?.heightReferenceRuleKey),
      // Katalogtan gelir — kod enum'u DEĞİL (ilke 1). Paket boşsa liste boş açılır.
      options: heightReferences.map((h) => ({ value: h.ruleKey, label: h.ruleKey })),
    },
    { name: "referenceLevel", label: tr.zoning.fields.referenceLevel, kind: "number", value: str(zoning?.referenceLevel) },
    { name: "levelDataSource", label: tr.zoning.fields.levelDataSource, kind: "select", value: str(zoning?.levelDataSource), options: opts(tr.levelDataSource) },
    { name: "planNotes", label: tr.zoning.fields.planNotes, kind: "textarea", value: str(zoning?.planNotes) },
  ]);

  // ------------------------------------------------------------------ A3
  const soilFields = [
    ...visibleFields("SoilData", tier, [
      { name: "soilClass", label: tr.soil.fields.soilClass, kind: "text", value: str(soil?.soilClass) },
      { name: "bearingCapacity", label: tr.soil.fields.bearingCapacity, kind: "number", value: str(soil?.bearingCapacity) },
      { name: "groundwaterLevel", label: tr.soil.fields.groundwaterLevel, kind: "number", value: str(soil?.groundwaterLevel) },
      { name: "liquefactionRisk", label: tr.soil.fields.liquefactionRisk, kind: "select", value: str(soil?.liquefactionRisk), options: opts(tr.liquefactionRisk) },
      { name: "foundationType", label: tr.soil.fields.foundationType, kind: "select", value: str(soil?.foundationType), options: opts(tr.foundationType) },
      { name: "pileRequired", label: tr.soil.fields.pileRequired, kind: "checkbox", value: soil?.pileRequired ?? false },
      { name: "shoringRequired", label: tr.soil.fields.shoringRequired, kind: "checkbox", value: soil?.shoringRequired ?? false },
      { name: "shoringMethod", label: tr.soil.fields.shoringMethod, kind: "text", value: str(soil?.shoringMethod) },
      { name: "shoringArea", label: tr.soil.fields.shoringArea, kind: "number", value: str(soil?.shoringArea) },
    ]),
    ...visibleFields("SiteData", tier, [
      { name: "topographyLevelDifference", label: tr.soil.fields.topographyLevelDifference, kind: "number", value: str(site?.topographyLevelDifference) },
      { name: "excavationHaulDistance", label: tr.soil.fields.excavationHaulDistance, kind: "number", value: str(site?.excavationHaulDistance) },
      { name: "disposalSiteFee", label: tr.soil.fields.disposalSiteFee, kind: "number", value: str(site?.disposalSiteFee) },
      { name: "siteAccessRoadWidth", label: tr.soil.fields.siteAccessRoadWidth, kind: "number", value: str(site?.siteAccessRoadWidth) },
      { name: "craneFeasible", label: tr.soil.fields.craneFeasible, kind: "checkbox", value: site?.craneFeasible ?? false },
      { name: "siteFencePerimeter", label: tr.soil.fields.siteFencePerimeter, kind: "number", value: str(site?.siteFencePerimeter) },
      { name: "fencedSides", label: tr.soil.fields.fencedSides, kind: "number", value: str(site?.fencedSides) },
    ]),
  ];

  // ------------------------------------------------------------------ A4
  const stakeholderFields = visibleFields("Stakeholder", tier, [
    { name: "name", label: tr.stakeholder.fields.name, kind: "text", value: null },
    { name: "contactPhone", label: tr.stakeholder.fields.contactPhone, kind: "text", value: null },
    { name: "contactEmail", label: tr.stakeholder.fields.contactEmail, kind: "text", value: null },
    { name: "shareRatio", label: tr.stakeholder.fields.shareRatio, kind: "number", value: null },
    { name: "existingUnitArea", label: tr.stakeholder.fields.existingUnitArea, kind: "number", value: null },
    { name: "agreementStance", label: tr.stakeholder.fields.agreementStance, kind: "select", value: null, options: opts(tr.agreementStance) },
    { name: "expectationNotes", label: tr.stakeholder.fields.expectationNotes, kind: "textarea", value: null },
  ]);

  const pct = (v: number) => `%${(v * 100).toFixed(2).replace(".", ",")}`;
  const m2 = (v: number | null) =>
    v === null ? tr.common.notEntered : `${v.toFixed(2).replace(".", ",")} m²`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.35rem", marginBottom: 2 }}>{project.name}</h1>
        <p style={{ color: "#71717a", marginTop: 0, fontSize: 13 }}>
          {tr.projectType[project.projectType]} · {tr.tier[tier]} ·{" "}
          {project.regionPackageVersionId ? tr.project.bound : tr.project.unbound}
        </p>
        <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 0 }}>{tr.wizard.tierHint}</p>

        <WizardSection
          title={tr.parcel.title}
          projectId={id}
          fields={parcelFields}
          action={saveParcelAction}
        />
        <WizardSection
          title={tr.zoning.title}
          projectId={id}
          fields={zoningFields}
          action={saveZoningAction}
        />
        <WizardSection
          title={tr.soil.title}
          projectId={id}
          fields={soilFields}
          action={saveSoilAction}
        />
        <WizardSection
          title={tr.stakeholder.title}
          projectId={id}
          fields={stakeholderFields}
          action={addStakeholderAction}
        />

        {project.stakeholders.length > 0 ? (
          <section style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "1rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>{tr.stakeholder.majority.title}</h2>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: 13 }}>
              {project.stakeholders.map((s) => (
                <li key={s.id}>
                  {s.name} — {s.shareRatio ? pct(Number(s.shareRatio)) : tr.common.notEntered}
                  {s.agreementStance ? ` · ${tr.agreementStance[s.agreementStance]}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Sağ panel — canlı özet (etut-surec-modeli.md§5) */}
      <aside>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e4e4e7",
            borderRadius: 8,
            padding: "1rem",
            position: "sticky",
            top: "1rem",
          }}
        >
          <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>{tr.wizard.summary}</h2>

          <dl style={{ margin: 0, fontSize: 13 }}>
            <Row label={tr.zoning.computed.maxFootprint} value={m2(l0.maxFootprint)} />
            <Row label={tr.zoning.computed.maxTotalFloorArea} value={m2(l0.maxTotalFloorArea)} />
            <Row label={tr.zoning.computed.envelopeArea} value={m2(l0.envelopeArea)} />
            <Row
              label={tr.zoning.computed.envelopeParts}
              value={l0.buildableEnvelope ? String(partCount(l0.buildableEnvelope)) : tr.common.notEntered}
            />
            <Row
              label={tr.zoning.computed.floorCount}
              value={l0.floorCount === null ? tr.common.notEntered : String(l0.floorCount)}
            />
            <Row
              label={tr.zoning.computed.basementGainFromLevelDifference}
              value={tr.common.notEntered}
            />
          </dl>

          <hr style={{ border: 0, borderTop: "1px solid #f4f4f5", margin: "0.9rem 0" }} />

          <h3 style={{ fontSize: "0.85rem", margin: "0 0 0.5rem" }}>
            {tr.stakeholder.majority.title}
          </h3>
          {majority.threshold === null ? (
            <p style={{ fontSize: 12, color: "#a16207", margin: 0 }}>
              {tr.stakeholder.majority.thresholdMissing}
            </p>
          ) : (
            <dl style={{ margin: 0, fontSize: 13 }}>
              <Row label={tr.stakeholder.majority.threshold} value={pct(majority.threshold)} />
              <Row label={tr.stakeholder.majority.agreed} value={pct(majority.agreedShare)} />
              <Row
                label={tr.stakeholder.majority.reached}
                value={majority.reached ? "✓" : "—"}
              />
            </dl>
          )}

          <WarningList warnings={[...l0.warnings, ...majority.warnings]} />
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "2px 0" }}>
      <dt style={{ color: "#71717a" }}>{label}</dt>
      <dd style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>{value}</dd>
    </div>
  );
}
