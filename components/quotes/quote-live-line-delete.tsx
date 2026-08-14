"use client";

import { useActionState } from "react";
import { X } from "lucide-react";

import { deleteQuoteLine } from "@/lib/quotes/actions";

const initialState = { message: "", status: "idle" as const };

export function QuoteLiveLineDelete({
  label,
  lineId,
  quoteId,
}: {
  label: string;
  lineId: string;
  quoteId: string;
}) {
  const [state, action, pending] = useActionState(deleteQuoteLine, initialState);

  return (
    <form
      action={action}
      className="inline-flex flex-col items-end"
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer « ${label} » du devis ?`)) event.preventDefault();
      }}
    >
      <input name="quoteId" type="hidden" value={quoteId} />
      <input name="lineId" type="hidden" value={lineId} />
      <button
        aria-label={`Supprimer ${label}`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        title="Supprimer cette ligne"
        type="submit"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      {state.status === "error" ? (
        <span className="mt-1 max-w-40 text-right text-[10px] text-red-600">{state.message}</span>
      ) : null}
    </form>
  );
}
