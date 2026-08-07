"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { QuoteAcceptance } from "@/lib/quotes/acceptance-queries";
import { initialQuoteFormState, type QuoteFormState } from "@/lib/validation/quote";

type Action = (state: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;
const inputClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const evidenceLabels = {
  deposit_payment: "Versement d'un acompte",
  signed_quote: "Devis signé avec mention d'accord",
  written_confirmation: "Confirmation écrite distincte",
} as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Enregistrement…" : "Enregistrer l'acceptation"}</Button>;
}

export function QuoteAcceptancePanel({ acceptance, action, quoteId, versionId }: { acceptance: QuoteAcceptance | null; action: Action; quoteId: string; versionId: string }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  if (acceptance) return <section className="space-y-2 rounded-lg border border-border p-5"><h2 className="text-xl font-semibold">Acceptation commerciale enregistrée</h2><p className="text-sm">Accepté le {new Intl.DateTimeFormat("fr-FR").format(new Date(`${acceptance.accepted_on}T12:00:00`))} par {acceptance.signatory_name}.</p><p className="text-sm text-muted-foreground">Preuve déclarée : {evidenceLabels[acceptance.evidence_type]}{acceptance.evidence_reference ? ` — ${acceptance.evidence_reference}` : ""}.</p><p className="text-xs text-muted-foreground">Cet enregistrement interne est immuable. Il ne constitue pas une signature électronique réalisée par Localiapro.fr.</p></section>;
  return <form action={formAction} className="space-y-4 rounded-lg border border-border p-5" noValidate><input name="quoteId" type="hidden" value={quoteId} /><input name="quoteVersionId" type="hidden" value={versionId} /><div><h2 className="text-xl font-semibold">Constater l’acceptation du client</h2><p className="mt-1 text-sm text-muted-foreground">À utiliser uniquement après avoir reçu une preuve d’acceptation hors de l’application. Cet écran ne réalise pas de signature électronique.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium" htmlFor="acceptance-date">Date d’acceptation</label><input aria-invalid={Boolean(state.fieldErrors?.acceptedOn)} className={inputClassName} id="acceptance-date" name="acceptedOn" required type="date" />{state.fieldErrors?.acceptedOn ? <p className="text-sm text-destructive">{state.fieldErrors.acceptedOn}</p> : null}</div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="acceptance-signatory">Nom du signataire</label><input aria-invalid={Boolean(state.fieldErrors?.signatoryName)} className={inputClassName} id="acceptance-signatory" maxLength={200} name="signatoryName" required type="text" />{state.fieldErrors?.signatoryName ? <p className="text-sm text-destructive">{state.fieldErrors.signatoryName}</p> : null}</div></div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="acceptance-evidence">Preuve constatée</label><select aria-invalid={Boolean(state.fieldErrors?.evidenceType)} className={inputClassName} id="acceptance-evidence" name="evidenceType" required><option value="">Sélectionnez</option><option value="signed_quote">Devis signé avec mention « bon pour accord » ou « bon pour travaux »</option><option value="written_confirmation">Confirmation écrite distincte</option><option value="deposit_payment">Versement d’un acompte</option></select>{state.fieldErrors?.evidenceType ? <p className="text-sm text-destructive">{state.fieldErrors.evidenceType}</p> : null}</div><div className="space-y-2"><label className="text-sm font-medium" htmlFor="acceptance-reference">Référence de la preuve <span className="text-muted-foreground">(facultatif)</span></label><input aria-invalid={Boolean(state.fieldErrors?.evidenceReference)} className={inputClassName} id="acceptance-reference" maxLength={500} name="evidenceReference" placeholder="Nom du fichier, email, référence du paiement…" type="text" />{state.fieldErrors?.evidenceReference ? <p className="text-sm text-destructive">{state.fieldErrors.evidenceReference}</p> : null}</div>{state.message ? <p aria-live="polite" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{state.message}</p> : null}<SubmitButton /></form>;
}
