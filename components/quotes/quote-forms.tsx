"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/catalog/queries";
import type { QuoteComplianceResult } from "@/lib/compliance/quote-compliance";
import type { QuoteLine, QuoteSection } from "@/lib/quotes/queries";
import {
  formatAmountInput,
  formatQuantityInput,
  formatRateInput,
  initialQuoteFormState,
  type QuoteFormState,
} from "@/lib/validation/quote";

type QuoteAction = (previousState: QuoteFormState, formData: FormData) => Promise<QuoteFormState>;

const inputClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const textAreaClassName = "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function FormMessage({ state }: { state: QuoteFormState }) {
  return state.message ? (
    <p aria-live="polite" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
      {state.message}
    </p>
  ) : null;
}

function FieldError({ state, name }: { state: QuoteFormState; name: string }) {
  return state.fieldErrors?.[name] ? <p className="text-sm text-destructive">{state.fieldErrors[name]}</p> : null;
}

function SubmitButton({ children, variant = "default" }: { children: string; variant?: "default" | "outline" | "destructive" }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit" variant={variant}>{pending ? "Enregistrement…" : children}</Button>;
}

export function CreateQuoteForm({ action, customers }: { action: QuoteAction; customers: { display_name: string; id: string }[] }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border p-5" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-customer">Client</label>
        <select aria-invalid={Boolean(state.fieldErrors?.customerId)} className={inputClassName} id="quote-customer" name="customerId" required>
          <option value="">SÃ©lectionnez un client</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name}</option>)}
        </select>
        <FieldError name="customerId" state={state} />
      </div>
      <FormMessage state={state} />
      <SubmitButton>CrÃ©er le devis</SubmitButton>
    </form>
  );
}

export function QuoteFinancialSettingsForm({ action, addresses, depositRateBasisPoints, discountRateBasisPoints, isQuoteFree, note, paymentTerms, preparationFeeHtCents, preparationFeeVatRateBasisPoints, quoteId, travelFeeApplicable, validUntil, workAddressId }: { action: QuoteAction; addresses: { address_line_1: string; city: string; id: string; label: string | null; postal_code: string }[]; depositRateBasisPoints: number; discountRateBasisPoints: number; isQuoteFree: boolean | null; note: string | null; paymentTerms: string | null; preparationFeeHtCents: number | null; preparationFeeVatRateBasisPoints: number | null; quoteId: string; travelFeeApplicable: boolean | null; validUntil: string | null; workAddressId: string | null }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2" noValidate>
      <input name="quoteId" type="hidden" value={quoteId} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-discount">Remise globale (%)</label>
        <input aria-invalid={Boolean(state.fieldErrors?.discountRateBasisPoints)} className={inputClassName} defaultValue={formatRateInput(discountRateBasisPoints)} id="quote-discount" inputMode="decimal" maxLength={6} name="discountRate" type="text" />
        <FieldError name="discountRateBasisPoints" state={state} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-deposit">Acompte demandÃ© (%)</label>
        <input aria-invalid={Boolean(state.fieldErrors?.depositRateBasisPoints)} className={inputClassName} defaultValue={formatRateInput(depositRateBasisPoints)} id="quote-deposit" inputMode="decimal" maxLength={6} name="depositRate" type="text" />
        <FieldError name="depositRateBasisPoints" state={state} />
      </div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="quote-valid-until">ValiditÃ© de lâ€™offre jusquâ€™au</label><input aria-invalid={Boolean(state.fieldErrors?.validUntil)} className={inputClassName} defaultValue={validUntil ?? ""} id="quote-valid-until" name="validUntil" required type="date" /><FieldError name="validUntil" state={state} /></div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="quote-work-address">Lieu dâ€™exÃ©cution</label><select aria-invalid={Boolean(state.fieldErrors?.workAddressId)} className={inputClassName} defaultValue={workAddressId ?? ""} id="quote-work-address" name="workAddressId"><option value="">SÃ©lectionnez une adresse client</option>{addresses.map((address) => <option key={address.id} value={address.id}>{address.label ? `${address.label} â€” ` : ""}{address.address_line_1}, {address.postal_code} {address.city}</option>)}</select><FieldError name="workAddressId" state={state} /></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Ã‰tablissement du devis</legend><label className="mr-4 inline-flex items-center gap-2 text-sm"><input defaultChecked={isQuoteFree === true} name="isQuoteFree" type="radio" value="free" /> Gratuit</label><label className="inline-flex items-center gap-2 text-sm"><input defaultChecked={isQuoteFree === false} name="isQuoteFree" type="radio" value="paid" /> Payant</label><FieldError name="isQuoteFree" state={state} /></fieldset>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="quote-preparation-fee">Prix HT du devis, s’il est payant (€)</label><input aria-invalid={Boolean(state.fieldErrors?.preparationFeeHtCents)} className={inputClassName} defaultValue={formatAmountInput(preparationFeeHtCents)} id="quote-preparation-fee" inputMode="decimal" name="preparationFeeHt" type="text" /><FieldError name="preparationFeeHtCents" state={state} /></div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="quote-preparation-fee-vat">TVA du devis payant (%)</label><input aria-invalid={Boolean(state.fieldErrors?.preparationFeeVatRateBasisPoints)} className={inputClassName} defaultValue={formatRateInput(preparationFeeVatRateBasisPoints)} id="quote-preparation-fee-vat" inputMode="decimal" name="preparationFeeVatRate" type="text" /><FieldError name="preparationFeeVatRateBasisPoints" state={state} /></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium">Frais de déplacement</legend><label className="mr-4 inline-flex items-center gap-2 text-sm"><input defaultChecked={travelFeeApplicable === true} name="travelFeeApplicable" type="radio" value="yes" /> Applicables</label><label className="inline-flex items-center gap-2 text-sm"><input defaultChecked={travelFeeApplicable === false} name="travelFeeApplicable" type="radio" value="no" /> Aucun</label><FieldError name="travelFeeApplicable" state={state} /></fieldset>
      <div className="space-y-2 sm:col-span-2"><label className="text-sm font-medium" htmlFor="quote-payment-terms">Conditions de paiement <span className="text-muted-foreground">(facultatif)</span></label><textarea className={textAreaClassName} defaultValue={paymentTerms ?? ""} id="quote-payment-terms" maxLength={2000} name="paymentTerms" /><FieldError name="paymentTerms" state={state} /></div>
      <div className="space-y-2 sm:col-span-2"><label className="text-sm font-medium" htmlFor="quote-note">Note <span className="text-muted-foreground">(facultatif)</span></label><textarea className={textAreaClassName} defaultValue={note ?? ""} id="quote-note" maxLength={4000} name="note" /><FieldError name="note" state={state} /></div>
      <div className="flex items-end gap-3"><SubmitButton>Enregistrer</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function FinalizeQuoteForm({ action, compliance, quoteId }: { action: QuoteAction; compliance: QuoteComplianceResult; quoteId: string }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return <form action={formAction} className="space-y-3 rounded-lg border border-border p-5"><input name="quoteId" type="hidden" value={quoteId} /><h2 className="text-lg font-semibold">Contrôle de conformité</h2>{compliance.errors.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">{compliance.errors.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul> : <p className="text-sm text-muted-foreground">Les contrôles obligatoires sont satisfaits.</p>}{compliance.warnings.length ? <div><p className="text-sm font-medium">Points à confirmer</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{compliance.warnings.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul></div> : null}<p className="text-sm text-muted-foreground">La finalisation attribue le numéro commercial et crée un snapshot immuable. Le devis ne pourra plus être modifié ni supprimé.</p>{compliance.valid ? <SubmitButton>Finaliser le devis</SubmitButton> : <p className="text-sm font-medium">Corrigez les éléments ci-dessus avant de finaliser.</p>}<FormMessage state={state} /></form>;
}

export function QuoteSectionForm({ action, quoteId, section }: { action: QuoteAction; quoteId: string; section?: QuoteSection }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  const id = section?.id ?? "new";
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4" noValidate>
      <input name="quoteId" type="hidden" value={quoteId} />
      {section ? <input name="sectionId" type="hidden" value={section.id} /> : null}
      <div className="min-w-52 flex-1 space-y-2">
        <label className="text-sm font-medium" htmlFor={`section-title-${id}`}>{section ? "Titre de section" : "Ajouter une section"}</label>
        <input aria-invalid={Boolean(state.fieldErrors?.title)} className={inputClassName} defaultValue={section?.title} id={`section-title-${id}`} maxLength={200} name="title" required type="text" />
        <FieldError name="title" state={state} />
      </div>
      <SubmitButton>{section ? "Modifier" : "Ajouter"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteQuoteSectionForm({ action, quoteId, sectionId }: { action: QuoteAction; quoteId: string; sectionId: string }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return <form action={formAction} className="space-y-2"><input name="quoteId" type="hidden" value={quoteId} /><input name="sectionId" type="hidden" value={sectionId} /><SubmitButton variant="destructive">Supprimer la section</SubmitButton><FormMessage state={state} /></form>;
}

export function QuoteLineForm({ action, catalogItems, line, quoteId, sections }: { action: QuoteAction; catalogItems: CatalogItem[]; line?: QuoteLine; quoteId: string; sections: QuoteSection[] }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  const id = line?.id ?? "new";
  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border p-4" noValidate>
      <input name="quoteId" type="hidden" value={quoteId} />
      {line ? <input name="lineId" type="hidden" value={line.id} /> : null}
      {!line ? <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-catalog-${id}`}>Depuis le catalogue <span className="text-muted-foreground">(facultatif)</span></label><select className={inputClassName} id={`line-catalog-${id}`} name="catalogItemId"><option value="">Saisie manuelle</option>{catalogItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="text-xs text-muted-foreground">Une prestation catalogue reprend cÃ´tÃ© serveur son libellÃ©, son unitÃ© et son prix HT. Renseignez toujours la TVA.</p></div> : <input name="catalogItemId" type="hidden" value={line.catalog_item_id ?? ""} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-label-${id}`}>LibellÃ©</label><input aria-invalid={Boolean(state.fieldErrors?.label)} className={inputClassName} defaultValue={line?.label} id={`line-label-${id}`} maxLength={200} name="label" type="text" /><FieldError name="label" state={state} /></div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-unit-${id}`}>UnitÃ©</label><input aria-invalid={Boolean(state.fieldErrors?.unit)} className={inputClassName} defaultValue={line?.unit} id={`line-unit-${id}`} maxLength={80} name="unit" placeholder="heure, forfait…" type="text" /><FieldError name="unit" state={state} /></div>
      </div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-kind-${id}`}>Nature de la ligne</label><select aria-invalid={Boolean(state.fieldErrors?.lineKind)} className={inputClassName} defaultValue={line?.line_kind ?? "service"} id={`line-kind-${id}`} name="lineKind"><option value="labor">Main-d’œuvre</option><option value="service">Prestation forfaitaire</option><option value="material">Produit ou matériel</option><option value="travel">Déplacement</option><option value="other">Autre</option></select><FieldError name="lineKind" state={state} /></div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-description-${id}`}>Description <span className="text-muted-foreground">(facultatif)</span></label><textarea aria-invalid={Boolean(state.fieldErrors?.description)} className={textAreaClassName} defaultValue={line?.description ?? ""} id={`line-description-${id}`} maxLength={1000} name="description" /><FieldError name="description" state={state} /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-quantity-${id}`}>QuantitÃ©</label><input aria-invalid={Boolean(state.fieldErrors?.quantityMilliunits)} className={inputClassName} defaultValue={line ? formatQuantityInput(line.quantity_milliunits) : "1"} id={`line-quantity-${id}`} inputMode="decimal" name="quantity" required type="text" /><FieldError name="quantityMilliunits" state={state} /></div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-price-${id}`}>Prix unitaire HT (â‚¬)</label><input aria-invalid={Boolean(state.fieldErrors?.unitPriceHtCents)} className={inputClassName} defaultValue={formatAmountInput(line?.unit_price_ht_cents ?? null)} id={`line-price-${id}`} inputMode="decimal" name="unitPriceHt" placeholder="Ã€ dÃ©finir" type="text" /><FieldError name="unitPriceHtCents" state={state} /></div>
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-vat-${id}`}>TVA (%)</label><input aria-invalid={Boolean(state.fieldErrors?.vatRateBasisPoints)} className={inputClassName} defaultValue={formatRateInput(line?.vat_rate_basis_points ?? null)} id={`line-vat-${id}`} inputMode="decimal" name="vatRate" placeholder="Ã€ dÃ©finir" type="text" /><FieldError name="vatRateBasisPoints" state={state} /></div>
      </div>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor={`line-section-${id}`}>Section <span className="text-muted-foreground">(facultatif)</span></label><select className={inputClassName} defaultValue={line?.section_id ?? ""} id={`line-section-${id}`} name="sectionId"><option value="">Sans section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></div>
      <FormMessage state={state} />
      <SubmitButton>{line ? "Enregistrer la ligne" : "Ajouter la ligne"}</SubmitButton>
    </form>
  );
}

export function DeleteQuoteLineForm({ action, lineId, quoteId }: { action: QuoteAction; lineId: string; quoteId: string }) {
  const [state, formAction] = useActionState(action, initialQuoteFormState);
  return <form action={formAction} className="space-y-2"><input name="quoteId" type="hidden" value={quoteId} /><input name="lineId" type="hidden" value={lineId} /><SubmitButton variant="destructive">Supprimer la ligne</SubmitButton><FormMessage state={state} /></form>;
}
