import Link from "next/link";
import { notFound } from "next/navigation";
import { tr, warningMessage } from "@/lib/i18n/tr";
import { computeAndStoreL0 } from "@/lib/envelope/service";
import { computeAndStoreL1 } from "@/lib/core/service";
import { createRuleReader } from "@/lib/rules/reader";
import { loadPlanContext } from "@/lib/plan/repository";
import { remainderOf } from "@/lib/plan/manual";
import {
  checkSubdivision,
  facadeSegments,
  type ConstraintKind,
  type UnitLayoutRuleInput,
} from "@/lib/subdivide/check";
import { multiPolygonArea, polygonArea, polygon, type LocalPolygon } from "@/lib/geometry";
import type { Warning } from "@/lib/warnings";
import { PlanCanvas, ClearPartitionForm, RunAutoForm, RunDetailForm } from "./plan-canvas";
import {
  savePartitionAction,
  clearPartitionAction,
  runL2Action,
  runDetailAction,
} from "./actions";

export const dynamic = "force-dynamic";

const panel: React.CSSProperties = {
  border: "1px solid #e4e4e7",
  borderRadius: 10,
  padding: "1rem 1.1rem",
  marginBottom: "1.1rem",
  background: "#fff",
};

const cell: React.CSSProperties = {
  padding: "0.4rem 0.55rem",
  borderBottom: "1px solid #e4e4e7",
  textAlign: "left",
  fontSize: 12,
};

const STATE_TONE: Record<string, string> = {
  saglandi: "#15803d",
  ihlal: "#b91c1c",
  degerlendirilemedi: "#a1a1aa",
};

const CONSTRAINTS: readonly ConstraintKind[] = [
  "coreAccess",
  "facade",
  "facadeLength",
  "areaTolerance",
  "aspectRatio",
];

/** Zarfın en büyük parçası — L1 ile aynı seçim. */
function largestPart(mp: ReturnType<typeof remainderOf> | null): LocalPolygon | null {
  if (!mp || mp.coordinates.length === 0) return null;
  let best = mp.coordinates[0]!;
  let bestArea = -Infinity;
  for (const rings of mp.coordinates) {
    const area = polygonArea(polygon(rings));
    if (area > bestArea) {
      bestArea = area;
      best = rings;
    }
  }
  return polygon(best);
}

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // ZİNCİR SIRASI ÖNEMLİ: L0 zarfı üretir, L1 ona yerleşir, plan ikisinin
  // yazdığı hesaplanan değerleri okur. Ters sırada çekirdek bir tur geriden gelir.
  await computeAndStoreL0(id);
  const l1 = await computeAndStoreL1(id);

  let context;
  try {
    context = await loadPlanContext(id);
  } catch {
    notFound();
  }

  const reader = await createRuleReader(id);
  const layoutRule = await reader.unitLayoutRule();
  const rule: UnitLayoutRuleInput | null = layoutRule
    ? {
        grossToNetFactor: num(layoutRule.grossToNetFactor),
        areaTolerance: num(layoutRule.areaTolerance),
        minUnitFacadeLength: num(layoutRule.minUnitFacadeLength),
        maxUnitAspectRatio: num(layoutRule.maxUnitAspectRatio),
      }
    : null;

  const plate = largestPart(context.envelope);
  const region = remainderOf(plate, context.core, context.circulation);

  // Bodrum katlar bölümlenmez — otopark ve servis mekanı orada.
  const planned = context.floors.filter((f) => f.floorType !== "bodrum");
  // PROGRAMI OLMAYAN KAT GÖSTERİLMEZ. Bölümlenecek bir şey yoktur ve her kat
  // için boş bir tuval + boş bir tanı tablosu basmak sayfayı gürültüye boğar.
  const floors = planned.filter((f) => f.units.length > 0);
  const withoutProgram = planned.filter((f) => f.units.length === 0);

  const warnings: Warning[] = [...l1.warnings, ...reader.warnings];

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>
      <p style={{ fontSize: 13, marginBottom: "0.6rem" }}>
        <Link href={`/projects/${id}/program`} style={{ color: "#3f3f46" }}>
          ← {tr.program.title}
        </Link>
      </p>
      <h1 style={{ fontSize: 22, margin: "0 0 0.3rem" }}>{tr.plan.title}</h1>
      <p style={{ fontSize: 13, color: "#52525b", marginTop: 0 }}>{tr.plan.intro}</p>

      {plate === null ? (
        <div style={panel}>
          <p style={{ margin: 0, fontSize: 13, color: "#a16207" }}>{tr.plan.noPlate}</p>
        </div>
      ) : (
        <div style={panel}>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", fontSize: 13 }}>
            <span>
              {tr.plan.plateArea}: <strong>{polygonArea(plate).toFixed(2)} m²</strong>
            </span>
            <span>
              {tr.plan.coreArea}:{" "}
              <strong>{context.core ? polygonArea(context.core).toFixed(2) : "—"} m²</strong>
            </span>
            <span>
              {tr.plan.remainderArea}: <strong>{multiPolygonArea(region).toFixed(2)} m²</strong>
            </span>
          </div>
          {context.core === null ? (
            <p style={{ fontSize: 12, color: "#a16207", marginBottom: 0 }}>{tr.plan.noCore}</p>
          ) : null}
        </div>
      )}

      {planned.length === 0 ? (
        <div style={panel}>
          <p style={{ margin: 0, fontSize: 13, color: "#a16207" }}>{tr.plan.noFloors}</p>
        </div>
      ) : null}

      {withoutProgram.length > 0 ? (
        <div style={panel}>
          <p style={{ margin: 0, fontSize: 12, color: "#a16207" }}>
            {tr.plan.noProgramFloors.replace(
              "{floors}",
              withoutProgram.map((f) => f.floorNo).join(", "),
            )}
          </p>
        </div>
      ) : null}

      {plate !== null
        ? floors.map((floor) => {
            const report = checkSubdivision({
              plate,
              core: context.core,
              circulation: context.circulation,
              facade: facadeSegments(plate),
              units: floor.units.map((u) => ({
                unitId: u.unitId,
                unitNo: u.unitNo,
                targetArea: u.targetArea,
                geometry: u.geometry,
              })),
              rule,
            });

            return (
              <section key={floor.floorId} style={panel}>
                <h2 style={{ fontSize: 16, margin: "0 0 0.2rem" }}>
                  {tr.plan.floor} {floor.floorNo}
                </h2>
                <p style={{ fontSize: 12, color: "#71717a", marginTop: 0 }}>
                  {tr.plan.residualArea}:{" "}
                  <strong>{report.residualArea === null ? "—" : report.residualArea.toFixed(2)} m²</strong>
                  {" · "}
                  {tr.plan.coverage}:{" "}
                  <strong>
                    {report.coverageRatio === null
                      ? "—"
                      : `%${(report.coverageRatio * 100).toFixed(1)}`}
                  </strong>
                </p>

                <h3 style={{ fontSize: 14, margin: "0.8rem 0 0.4rem" }}>{tr.plan.manualTitle}</h3>
                <PlanCanvas
                  projectId={id}
                  floorId={floor.floorId}
                  plate={plate}
                  core={context.core}
                  circulation={context.circulation}
                  region={region}
                  units={floor.units.map((u) => ({
                    id: u.unitId,
                    label: u.unitNo ?? u.unitId,
                    targetArea: u.targetArea,
                  }))}
                  action={savePartitionAction}
                />

                <h3 style={{ fontSize: 14, margin: "1.1rem 0 0.4rem" }}>{tr.plan.autoTitle}</h3>
                <RunAutoForm projectId={id} floorId={floor.floorId} action={runL2Action} />

                <h3 style={{ fontSize: 14, margin: "1.1rem 0 0.4rem" }}>{tr.plan.detailTitle}</h3>
                <RunDetailForm projectId={id} floorId={floor.floorId} action={runDetailAction} />

                <h3 style={{ fontSize: 14, margin: "1rem 0 0.4rem" }}>{tr.plan.diagnosticsTitle}</h3>
                <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 0 }}>{tr.plan.stateHint}</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th style={cell}>{tr.plan.unit}</th>
                        <th style={cell}>{tr.plan.target}</th>
                        <th style={cell}>{tr.plan.grossTarget}</th>
                        <th style={cell}>{tr.plan.achieved}</th>
                        <th style={cell}>{tr.plan.source}</th>
                        {CONSTRAINTS.map((c) => (
                          <th key={c} style={cell}>
                            {tr.plan.constraint[c]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.units.map((u) => {
                        const src = floor.units.find((f) => f.unitId === u.unitId);
                        return (
                          <tr key={u.unitId}>
                            <td style={cell}>{u.unitNo ?? u.unitId}</td>
                            <td style={cell}>{fmt(u.targetArea)}</td>
                            <td style={cell}>{fmt(u.grossTarget)}</td>
                            <td style={cell}>
                              {u.placed ? fmt(u.achievedArea) : tr.plan.notPlaced}
                            </td>
                            <td style={cell}>
                              {src?.isManual ? tr.plan.sourceManual : tr.plan.sourceAuto}
                            </td>
                            {CONSTRAINTS.map((kind) => {
                              const c = u.checks.find((x) => x.constraint === kind)!;
                              return (
                                <td key={kind} style={{ ...cell, color: STATE_TONE[c.state] }}>
                                  {tr.plan.state[c.state]}
                                  {c.measured === null ? "" : ` (${c.measured})`}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {floor.units.some((u) => u.isManual) ? (
                  <p style={{ marginTop: "0.7rem", marginBottom: 0 }}>
                    <ClearPartitionForm
                      projectId={id}
                      floorId={floor.floorId}
                      action={clearPartitionAction}
                    />
                  </p>
                ) : null}

                {report.warnings.length > 0 ? (
                  <ul
                    style={{
                      margin: "0.7rem 0 0",
                      paddingLeft: "1.1rem",
                      color: "#a16207",
                      fontSize: 12,
                    }}
                  >
                    {report.warnings.map((w, i) => (
                      <li key={`${w.code}-${i}`}>{warningMessage(w)}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })
        : null}

      {warnings.length > 0 ? (
        <section style={{ ...panel, background: "#fffbeb", borderColor: "#fde68a" }}>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#a16207", fontSize: 12 }}>
            {warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>{warningMessage(w)}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function num(d: { toString(): string } | null): number | null {
  return d === null ? null : Number(d.toString());
}

function fmt(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(2)} m²`;
}
