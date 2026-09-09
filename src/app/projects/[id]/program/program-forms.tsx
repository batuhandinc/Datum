"use client";

import { useActionState } from "react";
import { tr, warningMessage } from "@/lib/i18n/tr";
import type { ActionResult } from "./actions";

/**
 * A5 PROGRAM — istemci formları.
 *
 * Arayüz metni YALNIZCA i18n katmanından gelir; bu dosyada gömülü Türkçe
 * dize yoktur (bir mimari test bunu `src/app` altında zorluyor).
 */

const input: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  boxSizing: "border-box",
};

const button: React.CSSProperties = {
  padding: "0.4rem 0.9rem",
  border: 0,
  borderRadius: 6,
  background: "#18181b",
  color: "#fff",
  cursor: "pointer",
};

export const cell: React.CSSProperties = {
  padding: "0.45rem 0.6rem",
  borderBottom: "1px solid #e4e4e7",
  textAlign: "left",
  fontSize: 13,
};

export function Badge({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const colors = {
    neutral: ["#52525b", "#e4e4e7"],
    good: ["#15803d", "#bbf7d0"],
    warn: ["#a16207", "#fde68a"],
    bad: ["#b91c1c", "#fecaca"],
  }[tone];
  return (
    <em
      style={{
        fontStyle: "normal",
        fontSize: 10,
        color: colors[0],
        border: `1px solid ${colors[1]}`,
        borderRadius: 4,
        padding: "0 5px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </em>
  );
}

export function Feedback({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <>
      {state.ok === false ? (
        <p role="alert" style={{ color: "#b91c1c", fontSize: 13, margin: "0.5rem 0 0" }}>
          {state.message}
        </p>
      ) : null}
      {state.warnings && state.warnings.length > 0 ? (
        <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", color: "#a16207", fontSize: 12 }}>
          {state.warnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>{warningMessage(w as never)}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

/** Tek düğmeli, satır içi form — silme, kilitleme, örnekleme gibi işlemler. */
export function InlineForm({
  action,
  label,
  children,
  danger = false,
}: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      {children}
      <button
        type="submit"
        disabled={pending}
        style={{
          ...button,
          padding: "0.25rem 0.6rem",
          fontSize: 12,
          background: danger ? "#b91c1c" : "#3f3f46",
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {label}
      </button>
      {state?.ok === false ? (
        <span style={{ color: "#b91c1c", fontSize: 11 }}>{state.message}</span>
      ) : null}
    </form>
  );
}

export interface FloorOption {
  readonly id: string;
  readonly label: string;
}

/** Kat ekleme formu. */
export function AddFloorForm({
  projectId,
  action,
  floorTypes,
}: {
  projectId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  floorTypes: readonly { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ marginTop: "0.75rem" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.program.floors.floorNo}
          <input name="floorNo" inputMode="numeric" style={{ ...input, width: 90 }} />
        </label>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.program.floors.floorType}
          <select name="floorType" style={{ ...input, width: 140 }} defaultValue="normal">
            {floorTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.program.floors.grossHeight}
          <input name="grossHeight" inputMode="decimal" style={{ ...input, width: 110 }} />
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "#52525b" }}>
          <input type="checkbox" name="hasCommercial" />
          {tr.program.floors.hasCommercial}
        </label>
        <button type="submit" disabled={pending} style={{ ...button, cursor: pending ? "wait" : "pointer" }}>
          {tr.program.floors.add}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Tipoloji tanımlama formu. */
export function UnitTypeForm({
  projectId,
  action,
  initialCode = "",
  initialSpaces = "",
}: {
  projectId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  initialCode?: string;
  initialSpaces?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ marginTop: "0.75rem" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <div style={{ display: "grid", gap: 8, maxWidth: 460 }}>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.program.unitTypes.code}
          <input
            name="unitTypeCode"
            defaultValue={initialCode}
            placeholder={tr.program.unitTypes.codeHint}
            style={input}
          />
        </label>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.program.unitTypes.spaces}
          <textarea
            name="spaces"
            rows={6}
            defaultValue={initialSpaces}
            placeholder={tr.program.unitTypes.spacesHint}
            style={{ ...input, fontFamily: "ui-monospace, monospace" }}
          />
        </label>
        <div>
          <button type="submit" disabled={pending} style={{ ...button, cursor: pending ? "wait" : "pointer" }}>
            {tr.program.unitTypes.save}
          </button>
        </div>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** 8 soruluk başlangıç sihirbazı formu. */
export interface StartupField {
  readonly key: string;
  readonly label: string;
  readonly kind: "number" | "checkbox" | "select";
  readonly value: string | null;
  readonly options?: readonly { value: string; label: string }[];
  readonly sourceLabel: string;
  readonly sourceTone: "neutral" | "good" | "warn";
  readonly hint: string | null;
}

export function StartupForm({
  projectId,
  action,
  fields,
}: {
  projectId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  fields: readonly StartupField[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {fields.map((f) => (
          <div key={f.key} style={{ display: "grid", gap: 3 }}>
            <span style={{ fontSize: 12, color: "#52525b", display: "flex", gap: 6, alignItems: "center" }}>
              {f.label}
              <Badge text={f.sourceLabel} tone={f.sourceTone} />
            </span>
            {f.kind === "checkbox" ? (
              <input
                type="checkbox"
                name={f.key}
                defaultChecked={f.value === "true"}
                style={{ width: 16, height: 16 }}
              />
            ) : f.kind === "select" ? (
              <select name={f.key} defaultValue={f.value ?? ""} style={{ ...input, maxWidth: 320 }}>
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.key}
                inputMode="numeric"
                defaultValue={f.value ?? ""}
                style={{ ...input, maxWidth: 160 }}
              />
            )}
            {f.hint ? (
              <span style={{ fontSize: 11, color: "#a1a1aa" }}>{f.hint}</span>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "0.9rem" }}>
        <button type="submit" disabled={pending} style={{ ...button, cursor: pending ? "wait" : "pointer" }}>
          {tr.startup.save}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Otopark senaryosu seçme formu — gerekçe zorunlu değil ama istenir. */
export function ChooseScenarioForm({
  projectId,
  action,
  scenario,
  requiredCount,
}: {
  projectId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  scenario: {
    basementFloorCount: number;
    plannedCount: number;
    deficitCount: number;
  };
  requiredCount: number | null;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="basementFloorCount" value={scenario.basementFloorCount} />
      <input type="hidden" name="plannedCount" value={scenario.plannedCount} />
      <input type="hidden" name="deficitCount" value={scenario.deficitCount} />
      <input type="hidden" name="requiredCount" value={requiredCount ?? ""} />
      <input name="reason" placeholder={tr.parking.reason} style={{ ...input, fontSize: 12 }} />
      <button
        type="submit"
        disabled={pending}
        style={{ ...button, fontSize: 12, padding: "0.3rem 0.7rem", cursor: pending ? "wait" : "pointer" }}
      >
        {tr.parking.choose}
      </button>
      <Feedback state={state} />
    </form>
  );
}

/** Rampa genişliği formu — ayak izi otopark havuzundan düşülür. */
export function RampForm({
  projectId,
  action,
  width,
  length,
  footprintArea,
}: {
  projectId: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  width: string | null;
  length: string;
  footprintArea: string;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  return (
    <form action={formAction} style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="projectId" value={projectId} />
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#52525b" }}>
          {tr.parking.rampWidth}
          <input
            name="width"
            inputMode="decimal"
            defaultValue={width ?? ""}
            style={{ ...input, width: 120 }}
          />
        </label>
        <span style={{ fontSize: 13 }}>
          {tr.parking.rampLength}: <strong>{length}</strong>
        </span>
        <span style={{ fontSize: 13 }}>
          {tr.parking.rampFootprint}: <strong>{footprintArea}</strong>
        </span>
        <button
          type="submit"
          disabled={pending}
          style={{ ...button, fontSize: 12, padding: "0.3rem 0.8rem", cursor: pending ? "wait" : "pointer" }}
        >
          {tr.parking.rampSave}
        </button>
      </div>
      <p style={{ color: "#a1a1aa", fontSize: 11, marginBottom: 0 }}>{tr.parking.rampHint}</p>
      <Feedback state={state} />
    </form>
  );
}
