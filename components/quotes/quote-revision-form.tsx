"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PencilLine } from "lucide-react";

import {
  createQuoteRevision,
  initialQuoteRevisionState,
} from "@/lib/quotes/revision-actions";

function RevisionButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      disabled={pending}
      type="submit"
    >
      <PencilLine className="size-4" />
      {pending ? "Création de la version…" : "Modifier / Rééditer"}
    </button>
  );
}

export function QuoteRevisionForm({ quoteId }: { quoteId: string }) {
  const [state, action] = useActionState(createQuoteRevision, initialQuoteRevisionState);

  return (
    <form action={action} className="space-y-2">
      <input name="quoteId" type="hidden" value={quoteId} />
      <RevisionButton />
      {state.message ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
