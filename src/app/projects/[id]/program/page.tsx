import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { $Enums } from "@prisma/client";
import { tr, warningMessage } from "@/lib/i18n/tr";
import { divergedUnits, loadProgram } from "@/lib/program/repository";
import { formatSpaceLines, parseTemplateSpaces, templateTotalArea } from "@/lib/program/schemas";
import { readStartupState } from "@/lib/startup/questions";
import { readParkingLayout, readRamp } from "@/lib/startup/repository";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { computeAndStoreL1 } from "@/lib/core/service";
import { createRuleReader } from "@/lib/rules/reader";
import { computeServiceSpaces } from "@/lib/service-space/engine";
import { computeParkingScenarios, computeRamp } from "@/lib/parking/solver";
import { parseLocalMultiPolygon } from "@/lib/geometry/schema";
import { multiPolygonArea } from "@/lib/geometry";
import type { Warning } from "@/lib/warnings";
import {
  AddFloorForm,
  Badge,
  ChooseScenarioForm,
  InlineForm,
  RampForm,
  StartupForm,
  UnitTypeForm,
  cell,
  type StartupField,
} from "./program-forms";
import {
  addFloorAction,
  chooseParkingScenarioAction,
  deleteFloorAction,
  instantiateUnitTypeAction,
  saveRampAction,
  saveStartupAnswersAction,
  saveUnitTypeAction,
  setFloorLockAction,
} from "./actions";

export const dynamic = "force-dynamic";

const opts = (dict: Readonly<Record<string, string>>) =>
  Object.entries(dict).map(([value, label]) => ({ value, label }));

const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  padding: "1rem",
  marginBottom: "1rem",
};

function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function fmt(v: number | null, digits = 2): string {
  if (v === null) return tr.common.notEntered;
  return v.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ZİNCİR SIRASI ÖNEMLİ: L0 zarfı üretir, L1 ona yerleşir, program verisi
  // ikisinin yazdığı hesaplanan değerleri okur. Ters sırada `buildingHeight`
  // ve `buildableEnvelope` bir tur GERİDEN gelirdi.
  let l1: Awaited<ReturnType<typeof computeAndStoreL1>>;
  try {
    await computeAndStoreL0(id);
    l1 = await computeAndStoreL1(id);
  } catch {
    notFound();
  }

  const project = await loadProgram(id);

  const block = project.blocks[0] ?? null;
  const floors = block?.floors ?? [];
  const unitTypes = project.unitTypes;
  const totalUnits = floors.reduce((s, f) => s + f.units.length, 0);

  const [startup, divergence, reader, layout, rampRow] = await Promise.all([
    readStartupState(id),
    divergedUnits(id),
    createRuleReader(id),
    readParkingLayout(id),
    readRamp(id),
  ]);

  const [requiredSpaceRules, coefficients, parkingRule] = await Promise.all([
    reader.requiredSpaceRules(),
    reader.utilityCoefficients(),
    reader.parkingRule(),
  ]);

  // --- Servis mekanları ---
  const zoning = project.parcel?.zoningData ?? null;
  const envelope = parseLocalMultiPolygon(zoning?.buildableEnvelope ?? null);
  const plateArea = envelope ? multiPolygonArea(envelope) : null;
  const buildingHeight = num(block?.buildingHeight);
  const totalFloorArea = num(zoning?.maxTotalFloorArea);

  const services = computeServiceSpaces({
    unitCount: totalUnits > 0 ? totalUnits : null,
    totalFloorArea,
    buildingHeight,
    commonArea: null,
    rules: requiredSpaceRules.map((r) => ({
      ruleKey: r.ruleKey,
      serviceSpaceType: r.serviceSpaceType,
      triggerType: r.triggerType,
      threshold: Number(r.threshold),
      areaFormula: r.areaFormula,
    })),
    coefficients: coefficients
      ? {
          demandPowerPerUnit: num(coefficients.demandPowerPerUnit),
          demandPowerPerCommonArea: num(coefficients.demandPowerPerCommonArea),
          personsPerUnit: num(coefficients.personsPerUnit),
        }
      : null,
  });

  // --- Rampa ve otopark ---
  const basementFloors = floors.filter((f) => f.floorType === "bodrum");
  const basementHeight = num(basementFloors[0]?.grossHeight) ?? null;

  // Rampa genişliği kullanıcının girdiği `Ramp.width`'ten gelir. Girilene
  // kadar ayak izi BİLİNMEZ ve otopark senaryosu üretilmez.
  const ramp = computeRamp({
    basementFloorCount: basementFloors.length > 0 ? basementFloors.length : null,
    basementFloorHeight: basementHeight,
    maxRampSlope: num(parkingRule?.maxRampSlope ?? null),
    width: num(rampRow?.width ?? null),
  });

  // Bodrum YOKSA rampa da yoktur → ayak izi 0. Bodrum VARSA ama ayak izi
  // hesaplanamadıysa BİLİNMİYOR (null) — 0 saymak havuzu şişirirdi.
  const rampFootprint = basementFloors.length === 0 ? 0 : ramp.footprintArea;

  const parking = computeParkingScenarios({
    unitCount: totalUnits > 0 ? totalUnits : null,
    totalFloorArea,
    commercialArea: null,
    residentialUnitCount: totalUnits > 0 ? totalUnits : null,
    basementFloorArea: plateArea,
    serviceSpaceArea: services.mandatoryAreaTotal,
    coreArea: l1.area,
    rampFootprintArea: rampFootprint,
    rule: parkingRule
      ? {
          requirementFormula: parkingRule.requirementFormula,
          areaPerSpace: num(parkingRule.areaPerSpace),
          accessibleAreaPerSpace: num(parkingRule.accessibleAreaPerSpace),
          bicycleAreaPerSpace: num(parkingRule.bicycleAreaPerSpace),
          accessibleRatio: num(parkingRule.accessibleRatio),
          bicycleRatio: num(parkingRule.bicycleRatio),
          maxRampSlope: num(parkingRule.maxRampSlope),
        }
      : null,
    targetCount: num(layout?.targetCount ?? null),
  });

  // --- 8 soru ---
  const startupFields: StartupField[] = startup.answers.map((a) => {
    const base = {
      key: a.key,
      label: tr.startup.questions[a.key],
      value: a.value,
      sourceLabel: tr.startup.source[a.source],
      sourceTone: (a.source === "userOverride" ? "good" : a.source === "prefilled" ? "neutral" : "warn") as StartupField["sourceTone"],
      hint: a.hasPackageSource ? null : tr.startup.noPackageSource,
    };
    switch (a.key) {
      case "heatingSystemType":
        return { ...base, kind: "select", options: opts(tr.heatingSystemType), hint: tr.startup.unsupported };
      case "hasCommercialGroundFloor":
        return { ...base, kind: "checkbox" };
      case "hasUnitStorages":
        return { ...base, kind: "checkbox", hint: tr.startup.unsupported };
      case "roofType":
        return { ...base, kind: "select", options: opts(tr.roofType) };
      case "generatorScope":
        return { ...base, kind: "select", options: opts(tr.generatorScope), hint: tr.startup.unsupported };
      case "specificationLevel":
        return { ...base, kind: "select", options: opts(tr.specificationLevel) };
      default:
        return { ...base, kind: "number" };
    }
  });

  const allWarnings: Warning[] = [...l1.warnings, ...startup.warnings, ...services.warnings, ...ramp.warnings, ...parking.warnings];

  return (
    <>
      <p style={{ margin: 0 }}>
        <Link href={`/projects/${id}` as Route} style={{ color: "#52525b", fontSize: 13 }}>
          ← {tr.program.back}
        </Link>
      </p>
      <h1 style={{ fontSize: "1.4rem", margin: "0.25rem 0 0.25rem" }}>{tr.program.title}</h1>
      <p style={{ color: "#71717a", marginTop: 0, fontSize: 13 }}>{project.name}</p>

      {/* ---------------------------------------------------- 8 soru */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>{tr.startup.title}</h2>
        <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 0 }}>{tr.startup.note}</p>
        <StartupForm projectId={id} action={saveStartupAnswersAction} fields={startupFields} />
      </section>

      {/* ---------------------------------------------------- katlar */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>{tr.program.floors.title}</h2>
        <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 0 }}>{tr.program.mix.note}</p>

        {floors.length === 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 13 }}>{tr.program.floors.empty}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <th style={cell}>{tr.program.floors.floorNo}</th>
                <th style={cell}>{tr.program.floors.floorType}</th>
                <th style={cell}>{tr.program.floors.grossHeight}</th>
                <th style={cell}>{tr.program.floors.unitCount}</th>
                <th style={cell}>{tr.program.floors.locked}</th>
                <th style={cell} />
              </tr>
            </thead>
            <tbody>
              {floors.map((f) => (
                <tr key={f.id}>
                  <td style={cell}>{f.floorNo}</td>
                  <td style={cell}>{tr.floorType[f.floorType]}</td>
                  <td style={cell}>{fmt(num(f.grossHeight))}</td>
                  <td style={cell}>{f.units.length}</td>
                  <td style={cell}>
                    {f.isLocked ? (
                      <Badge text={tr.program.floors.locked} tone="warn" />
                    ) : (
                      <InlineForm action={setFloorLockAction} label={tr.program.floors.lock}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="floorId" value={f.id} />
                        <input type="hidden" name="isLocked" value="on" />
                        <select name="templateFloorId" style={{ fontSize: 11, padding: "0.15rem" }}>
                          <option value="">—</option>
                          {floors
                            .filter((o) => o.id !== f.id && !o.isLocked)
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.floorNo}
                              </option>
                            ))}
                        </select>
                      </InlineForm>
                    )}
                  </td>
                  <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap" }}>
                    {f.isLocked ? (
                      <InlineForm action={setFloorLockAction} label={tr.program.floors.unlock}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="floorId" value={f.id} />
                      </InlineForm>
                    ) : null}{" "}
                    <InlineForm action={deleteFloorAction} label={tr.program.floors.delete} danger>
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="floorId" value={f.id} />
                    </InlineForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 0 }}>{tr.program.floors.lockHint}</p>
        <AddFloorForm projectId={id} action={addFloorAction} floorTypes={opts(tr.floorType)} />
        <p style={{ fontSize: 13, marginBottom: 0 }}>
          {tr.program.mix.total}: <strong>{totalUnits}</strong>
        </p>
      </section>

      {/* ---------------------------------------------------- tipolojiler */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>{tr.program.unitTypes.title}</h2>

        {unitTypes.length === 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 13 }}>{tr.program.unitTypes.empty}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <th style={cell}>{tr.program.unitTypes.code}</th>
                <th style={cell}>{tr.program.unitTypes.totalArea}</th>
                <th style={cell}>{tr.program.unitTypes.instantiate}</th>
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((t) => {
                const spaces = parseTemplateSpaces(t.spaceList);
                return (
                  <tr key={t.id}>
                    <td style={cell}>{t.unitTypeCode}</td>
                    <td style={cell}>{fmt(templateTotalArea(spaces))} m²</td>
                    <td style={cell}>
                      <InlineForm action={instantiateUnitTypeAction} label={tr.program.unitTypes.instantiate}>
                        <input type="hidden" name="projectId" value={id} />
                        <input type="hidden" name="unitTypeCode" value={t.unitTypeCode} />
                        <select name="floorId" style={{ fontSize: 11, padding: "0.15rem" }}>
                          {floors.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.floorNo}
                            </option>
                          ))}
                        </select>
                        <input
                          name="count"
                          inputMode="numeric"
                          defaultValue="1"
                          style={{ width: 46, fontSize: 11, padding: "0.15rem" }}
                        />
                      </InlineForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <UnitTypeForm
          projectId={id}
          action={saveUnitTypeAction}
          initialCode={unitTypes[0]?.unitTypeCode ?? ""}
          initialSpaces={unitTypes[0] ? formatSpaceLines(parseTemplateSpaces(unitTypes[0].spaceList)) : ""}
        />
      </section>

      {/* ---------------------------------------------------- ayrışma */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>{tr.program.divergence.title}</h2>
        <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 0 }}>{tr.program.divergence.note}</p>
        {divergence.length === 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>{tr.program.divergence.none}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <th style={cell}>{tr.program.divergence.unit}</th>
                <th style={cell}>{tr.program.unitTypes.code}</th>
                <th style={cell}>{tr.program.divergence.template}</th>
                <th style={cell}>{tr.program.divergence.actual}</th>
                <th style={cell}>{tr.program.divergence.difference}</th>
              </tr>
            </thead>
            <tbody>
              {divergence.map((d) => (
                <tr key={d.unitId}>
                  <td style={cell}>{d.unitNo}</td>
                  <td style={cell}>{d.unitTypeCode}</td>
                  <td style={cell}>{fmt(d.templateArea)}</td>
                  <td style={cell}>{fmt(d.actualArea)}</td>
                  <td style={cell}>
                    <Badge text={fmt(d.difference)} tone="warn" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------------------------------------------------- çekirdek */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>{tr.core.title}</h2>
        {l1.geometry === null ? (
          <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>{tr.core.notPlaced}</p>
        ) : (
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.3rem 1rem", margin: 0, fontSize: 13 }}>
            <dt style={{ color: "#71717a" }}>{tr.core.strategy}</dt>
            <dd style={{ margin: 0 }}>
              {l1.coreStrategy ? tr.coreStrategy[l1.coreStrategy] : tr.common.notEntered}
            </dd>
            <dt style={{ color: "#71717a" }}>{tr.core.area}</dt>
            <dd style={{ margin: 0 }}>{fmt(l1.area)}</dd>
            <dt style={{ color: "#71717a" }}>{tr.core.requiredElevatorCount}</dt>
            <dd style={{ margin: 0 }}>{l1.requiredElevatorCount ?? tr.common.notEntered}</dd>
            <dt style={{ color: "#71717a" }}>{tr.core.escapeDistance}</dt>
            <dd style={{ margin: 0 }}>{fmt(l1.escapeDistance)}</dd>
          </dl>
        )}

        {block?.core && block.core.shafts.length > 0 ? (
          <>
            <h3 style={{ fontSize: 13, margin: "0.9rem 0 0.3rem" }}>{tr.core.shafts}</h3>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                {block.core.shafts.map((s) => (
                  <tr key={s.id}>
                    <td style={cell}>{s.shaftType ? tr.shaftType[s.shaftType] : "—"}</td>
                    <td style={cell}>
                      {fmt(num(s.offsetX))} / {fmt(num(s.offsetY))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 0 }}>{tr.core.continuityNote}</p>
          </>
        ) : null}
      </section>

      {/* ---------------------------------------------------- servis mekanları */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>{tr.serviceSpace.title}</h2>
        {services.requirements.length === 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>{tr.serviceSpace.empty}</p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f4f4f5" }}>
                  <th style={cell}>{tr.serviceSpace.title}</th>
                  <th style={cell}>{tr.serviceSpace.driver}</th>
                  <th style={cell}>{tr.serviceSpace.threshold}</th>
                  <th style={cell}>{tr.serviceSpace.requiredArea}</th>
                  <th style={cell} />
                </tr>
              </thead>
              <tbody>
                {services.requirements.map((r) => (
                  <tr key={r.ruleKey}>
                    <td style={cell}>
                      {tr.serviceSpaceType[r.serviceSpaceType as $Enums.ServiceSpaceType] ?? r.serviceSpaceType}
                    </td>
                    <td style={cell}>{r.driverValue === null ? "—" : fmt(r.driverValue)}</td>
                    <td style={cell}>{fmt(r.threshold)}</td>
                    <td style={cell}>{fmt(r.requiredArea)}</td>
                    <td style={cell}>
                      {r.isMandatory === true ? (
                        <Badge text={tr.serviceSpace.mandatory} tone="bad" />
                      ) : r.isMandatory === false ? (
                        <Badge text={tr.serviceSpace.optional} />
                      ) : (
                        <Badge text={tr.serviceSpace.undetermined} tone="warn" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 13, marginBottom: 0 }}>
              {tr.serviceSpace.total}: <strong>{fmt(services.mandatoryAreaTotal)}</strong>
            </p>
          </>
        )}
      </section>

      {/* ---------------------------------------------------- otopark */}
      <section style={panel}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>{tr.parking.title}</h2>
        <p style={{ color: "#a1a1aa", fontSize: 12, marginTop: 0 }}>{tr.parking.note}</p>

        <p style={{ fontSize: 13 }}>
          {tr.parking.requiredCount}: <strong>{parking.requiredCount ?? tr.common.notEntered}</strong>
        </p>

        <RampForm
          projectId={id}
          action={saveRampAction}
          width={rampRow?.width ? String(rampRow.width) : null}
          length={fmt(ramp.length)}
          footprintArea={fmt(ramp.footprintArea)}
        />

        {parking.scenarios.length === 0 ? (
          <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>{tr.parking.empty}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <th style={cell}>{tr.parking.basementFloorCount}</th>
                <th style={cell}>{tr.parking.usableArea}</th>
                <th style={cell}>{tr.parking.plannedCount}</th>
                <th style={cell}>{tr.parking.deficitCount}</th>
                <th style={cell} />
              </tr>
            </thead>
            <tbody>
              {parking.scenarios.map((s) => (
                <tr key={s.basementFloorCount}>
                  <td style={cell}>{s.basementFloorCount}</td>
                  <td style={cell}>{fmt(s.usableArea)}</td>
                  <td style={cell}>{s.plannedCount}</td>
                  <td style={cell}>
                    {s.deficitCount > 0 ? (
                      <Badge text={`${s.deficitCount} · ${tr.parking.deficitRisk}`} tone="bad" />
                    ) : (
                      <Badge text={tr.parking.meets} tone="good" />
                    )}
                  </td>
                  <td style={cell}>
                    {layout?.basementFloorCount === s.basementFloorCount ? (
                      <Badge text={tr.parking.chosen} tone="good" />
                    ) : (
                      <ChooseScenarioForm
                        projectId={id}
                        action={chooseParkingScenarioAction}
                        scenario={s}
                        requiredCount={parking.requiredCount}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {layout?.acceptedDeficitCount ? (
          <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 0 }}>
            {tr.parking.acceptedDeficit}: <strong>{layout.acceptedDeficitCount}</strong>
            {layout.basementFloorCountOverrideReason
              ? ` — ${layout.basementFloorCountOverrideReason}`
              : ""}
          </p>
        ) : null}
      </section>

      {/* ---------------------------------------------------- uyarılar */}
      {allWarnings.length > 0 ? (
        <section style={{ ...panel, borderColor: "#fde68a", background: "#fffbeb" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem", color: "#a16207" }}>
            {tr.common.warnings}
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#a16207", fontSize: 13 }}>
            {allWarnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{warningMessage(w)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
