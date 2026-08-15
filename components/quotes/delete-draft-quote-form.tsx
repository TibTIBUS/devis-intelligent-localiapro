"use client";

import { Trash2 } from "lucide-react";

export function DeleteDraftQuoteForm({
  action,
  customerName,
  finalized = false,
  quoteId,
}: {
  action: (formData: FormData) => Promise<void>;
  customerName: string;
  finalized?: boolean;
  quoteId: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = finalized
          ? `Supprimer définitivement le devis finalisé de ${customerName} ? Le devis, son PDF et l’acceptation éventuelle seront effacés. Cette action est irréversible.`
          : `Supprimer définitivement le brouillon de ${customerName} ?`;
        if (!window.confirm(message)) {
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
