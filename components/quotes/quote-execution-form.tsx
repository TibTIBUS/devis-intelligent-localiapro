"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialQuoteFormState, type QuoteFormState } from "@/lib/validation/quote";

type QuoteExecutionAction = (
  previousState: QuoteFormState,
  formData: FormData,
) => Promise<QuoteFormState>;

function SaveButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Enregistrement…" : "Enregistrer l’exécution"}</Button>;
}

export function QuoteExecutionForm({
  action,
  executionDuration,
  executionStartDate,
  quoteId,
}: {
  action: QuoteExecutionAction;
  executionDuration: string | null;
  executionStartDate: string | null;
  quoteId: string;
}) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input name="quoteId" type="hidden" value={quoteId} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-execution-start">Début prévu des travaux</label>
        <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={executionStartDate ?? ""} id="quote-execution-start" name="executionStartDate" required type="date" />
        {state.fieldErrors?.executionStartDate ? <p className="text-sm text-destructive">{state.fieldErrors.executionStartDate}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-execution-duration">Durée / délai estimé</label>
        <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={executionDuration ?? ""} id="quote-execution-duration" maxLength={200} name="executionDuration" placeholder="Ex. : 3 jours ouvrés" required type="text" />
        {state.fieldErrors?.executionDuration ? <p className="text-sm text-destructive">{state.fieldErrors.executionDuration}</p> : null}
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SaveButton />
        {state.message ? <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{state.message}</p> : null}
      </div>
    </form>
  );
}
