"use client";

import { useActionState } from "react";
import { tr } from "@/lib/i18n/tr";
import { createProjectAction, type ActionResult } from "./actions";

const TIERS = ["K1", "K2", "K3"] as const;
const TYPES = ["yeniYapi", "kentselDonusum", "ilaveKat", "guclendirme"] as const;

const field: React.CSSProperties = {
  padding: "0.45rem",
  border: "1px solid #d4d4d8",
  borderRadius: 6,
};

export function ProjectForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createProjectAction,
    null,
  );

  return (
    <form
      action={action}
      style={{
        background: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        padding: "1rem",
        margin: "1.5rem 0",
      }}
    >
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 4, flex: "2 1 14rem" }}>
          <span style={{ fontSize: 12, color: "#52525b" }}>{tr.project.fields.name}</span>
          <input name="name" required style={field} />
        </label>

        <label style={{ display: "grid", gap: 4, flex: "1 1 10rem" }}>
          <span style={{ fontSize: 12, color: "#52525b" }}>{tr.project.fields.projectType}</span>
          <select name="projectType" required style={field}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {tr.projectType[t]}
              </option>
            ))}
          </select>
        </label>

        {/* Kademe varsayılanı YOK — süreç modeli :351 ilk ekranda açıkça sordurur. */}
        <label style={{ display: "grid", gap: 4, flex: "1 1 10rem" }}>
          <span style={{ fontSize: 12, color: "#52525b" }}>{tr.project.fields.tier}</span>
          <select name="tier" required defaultValue="" style={field}>
            <option value="" disabled>
              —
            </option>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {tr.tier[t]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.5rem 1rem",
            border: 0,
            borderRadius: 6,
            background: pending ? "#71717a" : "#18181b",
            color: "#fff",
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {tr.project.create}
        </button>
      </div>

      {state && !state.ok ? (
        <p role="alert" style={{ color: "#b91c1c", margin: "0.75rem 0 0", fontSize: 14 }}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
