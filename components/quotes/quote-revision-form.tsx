"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PencilLine } from "lucide-react";

type QuoteRevisionState = {
  message?: string;
  status: "error" | "idle";
};

type QuoteRevisionAction = (
  previousState: QuoteRevisionState,
  formData: FormData,
) => Promise<QuoteRevisionState>;

const initialState: QuoteRevisionState = { status: "idle" };

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

export function QuoteRevisionForm({
  action,
  quoteId,
}: {
  action: QuoteRevisionAction;
  quoteId: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
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
