"use client";

import { useActionState, useMemo, useState } from "react";
import { tr, warningMessage } from "@/lib/i18n/tr";
import {
  boundingBox,
  polygonArea,
  polygon,
  type LocalMultiPolygon,
  type LocalPoint,
  type LocalPolygon,
} from "@/lib/geometry";
import { applyCuts, type CutLine } from "@/lib/plan/manual";
import type { ActionResult } from "./actions";

/**
 * MANUEL BÖLÜMLEME TUVALİ.
 *
 * Yeni bağımlılık YOK: satır içi SVG + pointer olayları. `src/lib/geometry`
 * zaten saf ve tarayıcıda çalışıyor, bu yüzden PARÇALAR CANLI HESAPLANIR —
 * kullanıcı kesmeyi bitirdiği anda bölünmeyi görür, kaydetmeyi beklemez.
 * Sunucudaki hesapla AYNI fonksiyon (`applyCuts`) kullanıldığı için önizleme
 * ile kaydedilen sonuç ayrışamaz.
 *
 * Arayüz metni YALNIZCA i18n katmanından gelir (mimari test zorunlu kılıyor).
 */

const PAD = 16;
const VIEW = 760;

const button: React.CSSProperties = {
  padding: "0.3rem 0.7rem",
  border: 0,
  borderRadius: 6,
  background: "#3f3f46",
  color: "#fff",
  fontSize: 12,
  cursor: "pointer",
};

const cell: React.CSSProperties = {
  padding: "0.4rem 0.55rem",
  borderBottom: "1px solid #e4e4e7",
  textAlign: "left",
  fontSize: 12,
};

export interface PlanCanvasProps {
  readonly projectId: string;
  readonly floorId: string;
  readonly plate: LocalPolygon;
  readonly core: LocalPolygon | null;
  readonly circulation: readonly LocalPolygon[];
  readonly region: LocalMultiPolygon;
  readonly units: readonly { id: string; label: string; targetArea: number | null }[];
  readonly action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}

export function PlanCanvas({
  projectId,
  floorId,
  plate,
  core,
  circulation,
  region,
  units,
  action,
}: PlanCanvasProps) {
  const [cuts, setCuts] = useState<CutLine[]>([]);
  const [current, setCurrent] = useState<LocalPoint[]>([]);
  const [assignments, setAssignments] = useState<(string | null)[]>([]);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);

  const box = useMemo(() => boundingBox(plate), [plate]);
  const scale = (VIEW - 2 * PAD) / Math.max(box.width, box.height, 1);

  const toScreen = (p: LocalPoint): [number, number] => [
    PAD + (p[0] - box.minX) * scale,
    PAD + (box.maxY - p[1]) * scale,
  ];

  const toLocal = (sx: number, sy: number): LocalPoint => [
    box.minX + (sx - PAD) / scale,
    box.maxY - (sy - PAD) / scale,
  ];

  // Parçalar CANLI hesaplanır — sunucudaki ile AYNI fonksiyon.
  const preview = useMemo(() => applyCuts(region, cuts), [region, cuts]);

  const pieceAreas = preview.pieces.map((p) => polygonArea(p));

  const path = (poly: LocalPolygon): string =>
    poly.coordinates
      .map(
        (ring) =>
          ring
            .map((p, i) => {
              const [x, y] = toScreen(p);
              return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ") + " Z",
      )
      .join(" ");

  function onCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
    setCurrent((pts) => [...pts, toLocal(sx, sy)]);
  }

  function finishCut() {
    if (current.length < 2) return;
    setCuts((c) => [...c, { points: current }]);
    setCurrent([]);
    setAssignments([]);
  }

  const paletteFor = (i: number) =>
    ["#bfdbfe", "#bbf7d0", "#fde68a", "#fecaca", "#ddd6fe", "#bae6fd", "#fed7aa"][i % 7]!;

  return (
    <form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="floorId" value={floorId} />
      <input type="hidden" name="cuts" value={JSON.stringify(cuts)} />
      <input type="hidden" name="assignments" value={JSON.stringify(assignments)} />

      <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 0.5rem" }}>{tr.plan.canvasHint}</p>

      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        onClick={onCanvasClick}
        style={{
          width: "100%",
          maxWidth: VIEW,
          border: "1px solid #d4d4d8",
          borderRadius: 8,
          background: "#fafafa",
          cursor: "crosshair",
        }}
      >
        {/* Plaka */}
        <path d={path(plate)} fill="#fff" stroke="#18181b" strokeWidth={1.5} />

        {/* Parçalar — canlı önizleme */}
        {preview.pieces.map((p, i) => (
          <path key={`piece-${i}`} d={path(p)} fill={paletteFor(i)} fillOpacity={0.75} stroke="#a1a1aa" strokeWidth={0.75} />
        ))}

        {/* Sirkülasyon */}
        {circulation.map((c, i) => (
          <path key={`circ-${i}`} d={path(c)} fill="#e4e4e7" stroke="#71717a" strokeWidth={1} />
        ))}

        {/* Çekirdek */}
        {core ? <path d={path(core)} fill="#52525b" fillOpacity={0.85} stroke="#18181b" strokeWidth={1} /> : null}

        {/* Tamamlanmış kesmeler */}
        {cuts.map((c, i) => (
          <polyline
            key={`cut-${i}`}
            points={c.points.map((p) => toScreen(p).join(",")).join(" ")}
            fill="none"
            stroke="#b91c1c"
            strokeWidth={2}
          />
        ))}

        {/* Çizilmekte olan kesme */}
        {current.length > 0 ? (
          <>
            <polyline
              points={current.map((p) => toScreen(p).join(",")).join(" ")}
              fill="none"
              stroke="#b91c1c"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            {current.map((p, i) => {
              const [x, y] = toScreen(p);
              return <circle key={`pt-${i}`} cx={x} cy={y} r={3} fill="#b91c1c" />;
            })}
          </>
        ) : null}

        {/* Parça numaraları */}
        {preview.pieces.map((p, i) => {
          const b = boundingBox(p);
          const [x, y] = toScreen([(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]);
          return (
            <text key={`lbl-${i}`} x={x} y={y} textAnchor="middle" fontSize={13} fill="#18181b">
              {i + 1}
            </text>
          );
        })}
      </svg>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0.6rem 0" }}>
        <button type="button" onClick={finishCut} style={button} disabled={current.length < 2}>
          {tr.plan.finishCut}
        </button>
        <button
          type="button"
          onClick={() => setCurrent((p) => p.slice(0, -1))}
          style={button}
          disabled={current.length === 0}
        >
          {tr.plan.undoPoint}
        </button>
        <button
          type="button"
          onClick={() => {
            setCuts((c) => c.slice(0, -1));
            setAssignments([]);
          }}
          style={button}
          disabled={cuts.length === 0}
        >
          {tr.plan.removeLastCut}
        </button>
        <button
          type="button"
          onClick={() => {
            setCuts([]);
            setCurrent([]);
            setAssignments([]);
          }}
          style={button}
          disabled={cuts.length === 0 && current.length === 0}
        >
          {tr.plan.clearCuts}
        </button>
        <span style={{ fontSize: 12, color: "#52525b", alignSelf: "center" }}>
          {cuts.length} {tr.plan.cutCount} · {preview.pieces.length} {tr.plan.pieceCount} ·{" "}
          {tr.plan.lostArea}: {preview.lostArea.toFixed(3)} m²
        </span>
      </div>

      <h4 style={{ fontSize: 13, margin: "0.8rem 0 0.3rem" }}>{tr.plan.assignTitle}</h4>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 560 }}>
        <thead>
          <tr>
            <th style={cell}>{tr.plan.piece}</th>
            <th style={cell}>{tr.plan.achieved}</th>
            <th style={cell}>{tr.plan.unit}</th>
          </tr>
        </thead>
        <tbody>
          {preview.pieces.map((_, i) => (
            <tr key={`row-${i}`}>
              <td style={cell}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    background: paletteFor(i),
                    marginRight: 6,
                    border: "1px solid #a1a1aa",
                  }}
                />
                {i + 1}
              </td>
              <td style={cell}>{pieceAreas[i]!.toFixed(2)} m²</td>
              <td style={cell}>
                <select
                  value={assignments[i] ?? ""}
                  onChange={(e) =>
                    setAssignments((a) => {
                      const next = [...a];
                      while (next.length < preview.pieces.length) next.push(null);
                      next[i] = e.target.value === "" ? null : e.target.value;
                      return next;
                    })
                  }
                  style={{ padding: "0.2rem 0.35rem", fontSize: 12 }}
                >
                  <option value="">{tr.plan.unassigned}</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                      {u.targetArea === null ? "" : ` · ${u.targetArea.toFixed(1)} m²`}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "0.8rem" }}>
        <button
          type="submit"
          disabled={pending}
          style={{ ...button, background: "#18181b", padding: "0.4rem 0.9rem", fontSize: 13 }}
        >
          {tr.plan.apply}
        </button>
      </div>

      {state?.ok === false ? (
        <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>
          {state.message}
        </p>
      ) : null}
      {state?.warnings && state.warnings.length > 0 ? (
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", color: "#a16207", fontSize: 12 }}>
          {state.warnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>{warningMessage(w as never)}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

/** Basit tek düğmeli form — manuel bölümlemeyi kaldırmak için. */
export function ClearPartitionForm({
  projectId,
  floorId,
  action,
}: {
  projectId: string;
  floorId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ display: "inline" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="floorId" value={floorId} />
      <button type="submit" disabled={pending} style={{ ...button, background: "#b91c1c" }}>
        {tr.plan.clearManual}
      </button>
      {state?.ok === false ? (
        <span style={{ color: "#b91c1c", fontSize: 11, marginLeft: 6 }}>{state.message}</span>
      ) : null}
    </form>
  );
}

export { polygon };
