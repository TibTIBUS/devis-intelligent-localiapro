import { PencilLine } from "lucide-react";

import { createQuoteRevision } from "@/lib/quotes/revision-actions";

export function QuoteRevisionForm({ quoteId }: { quoteId: string }) {
  return (
    <form action={createQuoteRevision}>
      <input name="quoteId" type="hidden" value={quoteId} />
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-muted sm:w-auto" type="submit">
        <PencilLine className="size-4" />
        Modifier / Rééditer
      </button>
    </form>
  );
}
