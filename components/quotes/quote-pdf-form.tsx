"use client";

import { useFormStatus } from "react-dom";

import { generateQuotePdfDocument } from "@/lib/documents/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={pending} type="submit">{pending ? "Génération…" : "Générer et télécharger le PDF"}</button>;
}

export function QuotePdfForm({ quoteId, versionId }: { quoteId: string; versionId: string }) {
  return <form action={generateQuotePdfDocument}><input name="quoteId" type="hidden" value={quoteId} /><input name="versionId" type="hidden" value={versionId} /><SubmitButton /></form>;
}
