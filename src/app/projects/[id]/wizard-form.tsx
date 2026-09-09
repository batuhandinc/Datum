"use client";

import { useActionState } from "react";
import { tr, warningMessage } from "@/lib/i18n/tr";
import type { ActionResult } from "./actions";

/**
 * SİHİRBAZ FORM BİLEŞENİ.
 *
 * Alan listesi SUNUCUDA hazırlanır (kademe filtresi orada uygulanır) ve buraya
 * veri olarak gelir. Bu bileşen alan adlarını BİLMEZ — böylece her ekran aynı
 * kodu kullanır ve arayüz metni yalnızca i18n katmanından gelir.
 *
 * İLKE 7: kaydetme eksik alan yüzünden ENGELLENMEZ. Uyarılar kaydın YANINDA
 * gösterilir; form yine kaydeder.
 */

export type FieldKind = "text" | "number" | "checkbox" | "select" | "textarea";

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly value: string | boolean | null;
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  /** Kademe rozeti — kullanıcı alanın hangi kademede açıldığını görür. */
  readonly tier?: string;
}

const inputStyle: React.CSSProperties = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #d4d4d8",
  borderRadius: 6,
  width: "100%",
  boxSizing: "border-box",
};

function Field({ spec }: { spec: FieldSpec }) {
  const common = { id: spec.name, name: spec.name, style: inputStyle };

  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#52525b", display: "flex", gap: 6 }}>
        {spec.label}
        {spec.tier ? (
          <em
            style={{
              fontStyle: "normal",
              fontSize: 10,
              color: "#a1a1aa",
              border: "1px solid #e4e4e7",
              borderRadius: 4,
              padding: "0 4px",
            }}
          >
            {spec.tier}
          </em>
        ) : null}
      </span>

      {spec.kind === "checkbox" ? (
        <input
          type="checkbox"
          {...common}
          style={{ width: 16, height: 16 }}
          defaultChecked={spec.value === true}
        />
      ) : spec.kind === "select" ? (
        <select {...common} defaultValue={typeof spec.value === "string" ? spec.value : ""}>
          <option value="">—</option>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : spec.kind === "textarea" ? (
        <textarea {...common} rows={3} defaultValue={typeof spec.value === "string" ? spec.value : ""} />
      ) : (
        <input
          {...common}
          type={spec.kind === "number" ? "text" : "text"}
          inputMode={spec.kind === "number" ? "decimal" : undefined}
          defaultValue={typeof spec.value === "string" ? spec.value : ""}
        />
      )}
    </label>
  );
}

export function WizardSection({
  title,
  projectId,
  fields,
  action,
  emptyNote,
  children,
}: {
  title: string;
  projectId: string;
  fields: readonly FieldSpec[];
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  emptyNote?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>{title}</h2>

      {fields.length === 0 ? (
        <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>
          {emptyNote ?? tr.wizard.tierGate}
        </p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="projectId" value={projectId} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {fields.map((f) => (
              <Field key={f.name} spec={f} />
            ))}
          </div>

          {children}

          <div style={{ marginTop: "0.9rem", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "0.45rem 1rem",
                border: 0,
                borderRadius: 6,
                background: pending ? "#71717a" : "#18181b",
                color: "#fff",
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {tr.common.save}
            </button>
            {state?.ok === true ? (
              <span style={{ color: "#15803d", fontSize: 13 }}>{tr.common.saved}</span>
            ) : null}
          </div>

          {state && !state.ok ? (
            <p role="alert" style={{ color: "#b91c1c", margin: "0.75rem 0 0", fontSize: 13 }}>
              {state.message}
            </p>
          ) : null}

          {state?.warnings && state.warnings.length > 0 ? (
            <WarningList warnings={state.warnings} />
          ) : null}
        </form>
      )}
    </section>
  );
}

export function WarningList({
  warnings,
}: {
  warnings: readonly { code: string; params?: Record<string, string | number> }[];
}) {
  if (warnings.length === 0) return null;
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ fontSize: 12, color: "#a16207", marginBottom: 4 }}>{tr.common.warnings}</div>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#a16207", fontSize: 13 }}>
        {warnings.map((w, i) => (
          // İlke 7: bunlar UYARI, hata değil — kayıt yapıldı.
          <li key={`${w.code}-${i}`}>{warningMessage(w as never)}</li>
        ))}
      </ul>
    </div>
  );
}
