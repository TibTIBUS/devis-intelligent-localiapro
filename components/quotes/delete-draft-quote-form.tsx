"use client";

import { Trash2 } from "lucide-react";

export function DeleteDraftQuoteForm({
  action,
  customerName,
  quoteId,
}: {
  action: (formData: FormData) => Promise<void>;
  customerName: string;
  quoteId: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer définitivement le brouillon de ${customerName} ?`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="quoteId" type="hidden" value={quoteId} />
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        type="submit"
      >
        <Trash2 className="size-3.5" />
        Supprimer
      </button>
    </form>
  );
}
