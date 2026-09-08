"use client";

import { useActionState } from "react";
import { tr } from "@/lib/i18n/tr";
import { deleteProjectAction, type ActionResult } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    deleteProjectAction,
    null,
  );

  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        style={{ border: 0, background: "none", color: "#b91c1c", cursor: "pointer" }}
      >
        {tr.project.delete}
      </button>
      {state && !state.ok ? (
        <span role="alert" style={{ color: "#b91c1c", fontSize: 12, marginLeft: 8 }}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
