import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Mail, MapPin, Phone, ReceiptText, UserRound } from "lucide-react";

import { DeleteDraftQuoteForm } from "@/components/quotes/delete-draft-quote-form";
import {
  DeleteQuoteLineForm,
  DeleteQuoteSectionForm,
  FinalizeQuoteForm,
  QuoteFinancialSettingsForm,
  QuoteLineForm,
  QuoteSectionForm,
} from "@/components/quotes/quote-forms";
import { QuotePdfForm } from "@/components/quotes/quote-pdf-form";
import { QuoteAcceptancePanel } from "@/components/quotes/quote-acceptance-form";
import { QuoteAssistant } from "@/components/quotes/quote-assistant";
import { QuoteWorkflowPanel } from "@/components/quotes/quote-workflow-panel";
import { VoiceActionLink } from "@/components/voice/voice-action-link";
import { getCatalogItems } from "@/lib/catalog/queries";
import { getCompanyLegalInformation } from "@/lib/company/queries";
import { validateQuoteCompliance, type QuoteComplianceResult } from "@/lib/compliance/quote-compliance";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import {
  deleteQuoteLine,
  deleteQuoteSection,
  finalizeQuote,
  saveQuoteFinancialSettings,
  saveQuoteLine,
  saveQuoteSection,
} from "@/lib/quotes/actions";
import { recordQuoteAcceptance } from "@/lib/quotes/acceptance-actions";
import { getQuoteAcceptance } from "@/lib/quotes/acceptance-queries";
import { deleteDraftQuote } from "@/lib/quotes/list-actions";
import { getQuoteEditorData, type QuoteLine, type QuoteSection } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(Number(amount) / 100);
}

function formatDate(value: string | null) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}

function unavailableCompliance(): QuoteComplianceResult {
  return {
    errors: [{
      code: "COMPLIANCE_UNAVAILABLE",
      field: "quote",
      message: "Le contrôle de conformité est momentanément indisponible. Vos modifications restent enregistrées.",
    }],
    rulesVersion: "unavailable",
    valid: false,
    warnings: [],
  };
}

async function getComplianceSafely(
  supabase: Awaited<ReturnType<typeof createClient>>,
  quoteId: string,
): Promise<QuoteComplianceResult> {
  try {
    return await validateQuoteCompliance(supabase, quoteId);
  } catch {
    return unavailableCompliance();
  }
}

function DraftContent({ catalogItems, lines, quoteId, sections }: {
  catalogItems: Awaited<ReturnType<typeof getCatalogItems>>;
  lines: QuoteLine[];
  quoteId: string;
  sections: QuoteSection[];
}) {
  const linesBySection = new Map(sections.map((section) => [section.id, lines.filter((line) => line.section_id === section.id)]));
  const unsectionedLines = lines.filter((line) => line.section_id === null);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-background shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="font-semibold">Détail des prestations</h2><p className="text-sm text-muted-foreground">Organisez les prestations et ajustez les lignes du devis.</p></div>
        </div>
        <div className="space-y-5 p-4 sm:p-5">
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4"><p className="mb-3 text-sm font-medium">Ajouter une section</p><QuoteSectionForm action={saveQuoteSection} quoteId={quoteId} /></div>
          {sections.map((section) => (
            <article className="space-y-4 rounded-xl border border-border bg-muted/10 p-3 sm:p-4" key={section.id}>
              <QuoteSectionForm action={saveQuoteSection} quoteId={quoteId} section={section} />
              {(linesBySection.get(section.id) ?? []).map((line) => (
                <div className="space-y-3 rounded-xl border border-border bg-background p-3 sm:p-4" key={line.id}>
                  <QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={quoteId} sections={sections} />
                  <div className="flex justify-end"><DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={quoteId} /></div>
                </div>
              ))}
              {(linesBySection.get(section.id) ?? []).length === 0 ? <DeleteQuoteSectionForm action={deleteQuoteSection} quoteId={quoteId} sectionId={section.id} /> : null}
            </article>
          ))}
          {unsectionedLines.length ? (
            <div className="space-y-3">
              <div><h3 className="font-semibold">Lignes sans section</h3><p className="text-sm text-muted-foreground">Prestations ajoutées directement au devis.</p></div>
              {unsectionedLines.map((line) => (
                <article className="space-y-3 rounded-xl border border-border p-3 sm:p-4" key={line.id}>
                  <QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={quoteId} sections={sections} />
                  <div className="flex justify-end"><DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={quoteId} /></div>
                </article>
              ))}
            </div>
          ) : null}
          <div className="rounded-xl border border-dashed border-border p-4"><h3 className="mb-3 font-semibold">Ajouter une prestation</h3><QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} quoteId={quoteId} sections={sections} /></div>
        </div>
      </section>
    </div>
  );
}

function FinalizedContent({ lines }: { lines: QuoteLine[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">Contenu finalisé</h2><p className="text-sm text-muted-foreground">Cette version est immuable.</p></div>
      <div className="divide-y divide-border">
        {lines.map((line) => (
          <article className="p-4 sm:p-5" key={line.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div><h3 className="font-medium">{line.label}</h3><p className="mt-1 text-sm text-muted-foreground">{line.quantity_milliunits / 1_000} {line.unit} × {formatCents(BigInt(line.unit_price_ht_cents ?? 0))} HT</p></div>
              <p className="text-sm">TVA {(line.vat_rate_basis_points ?? 0) / 100} %</p>
            </div>
            {line.description ? <p className="mt-2 text-sm text-muted-foreground">{line.description}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function TotalsCard({ totals }: { totals: Awaited<ReturnType<typeof getQuoteEditorData>> extends infer Editor ? Editor extends { totals: infer Totals } ? Totals : never : never }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><ReceiptText className="size-4" /></div><h2 className="font-semibold">Récapitulatif</h2></div>
      {totals.isComplete ? (
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Sous-total HT</span><span>{formatCents(totals.subtotalHtCents)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Remise HT</span><span>- {formatCents(totals.discountHtCents)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Total HT</span><span>{formatCents(totals.totalHtCents)}</span></div>
          {totals.vatBreakdown.map((vat) => <div className="flex justify-between gap-4" key={vat.vatRateBasisPoints}><span className="text-muted-foreground">TVA {vat.vatRateBasisPoints / 100} %</span><span>{formatCents(vat.vatCents)}</span></div>)}
          <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold text-emerald-700"><span>Total TTC</span><span>{formatCents(totals.totalTtcCents)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Acompte demandé</span><span>{formatCents(totals.depositCents)}</span></div>
        </div>
      ) : <p className="text-sm text-muted-foreground">Total en attente : renseignez le prix HT et la TVA des lignes {totals.missingLineIndexes.map((index) => index + 1).join(", ")}.</p>}
    </section>
  );
}

export default async function QuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const [editor, customers, catalogItems, acceptance, company] = await Promise.all([
    getQuoteEditorData(supabase, organizationId, quoteId),
    getCustomers(supabase, organizationId),
    getCatalogItems(supabase, organizationId),
    getQuoteAcceptance(supabase, organizationId, quoteId),
    getCompanyLegalInformation(supabase, organizationId),
  ]);
  if (!editor) notFound();

  const compliance: QuoteComplianceResult | null = editor.quote.status === "draft"
    ? await getComplianceSafely(supabase, editor.quote.id)
    : null;
  const customer = customers.find((item) => item.id === editor.quote.customer_id);
  const finalized = editor.quote.status === "finalized";
  const primaryContact = customer?.contacts.find((contact) => contact.is_primary) ?? customer?.contacts[0];
  const primaryAddress = customer?.addresses.find((address) => address.is_primary) ?? customer?.addresses[0];
  const statusLabel = !finalized ? "Brouillon" : acceptance ? "Accepté" : "Finalisé";
  const statusClassName = !finalized ? "bg-amber-50 text-amber-700" : acceptance ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return (
    <main className="min-h-svh bg-muted/20 px-3 py-5 min-[375px]:px-4 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
        <div className="space-y-4">
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" href="/devis"><ArrowLeft className="size-4" />Retour à la liste des devis</Link>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3"><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{editor.quote.quote_number ?? `Devis de ${customer?.display_name ?? "client"}`}</h1><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>{statusLabel}</span></div>
              <p className="mt-2 text-sm text-muted-foreground">{finalized ? "Devis finalisé et immuable." : `Devis en cours de préparation pour ${customer?.display_name ?? "ce client"}.`}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              {finalized && editor.quote.quote_version_id ? <div className="rounded-lg border border-border bg-background px-1 py-1 shadow-sm"><QuotePdfForm quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} /></div> : null}
              {!finalized ? <VoiceActionLink className="w-full justify-center sm:w-auto" description="Ajouter ou modifier des prestations par dictée" href={`/devis/${editor.quote.id}/voix`} /> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[260px_minmax(0,1fr)_300px]">
          <aside className="space-y-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:sticky xl:top-24 xl:col-span-1 xl:block xl:space-y-5">
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-blue-50 p-2 text-blue-700"><UserRound className="size-4" /></div><h2 className="font-semibold">Informations client</h2></div>
              <p className="font-semibold">{customer?.display_name ?? "Client"}</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {primaryContact?.email ? <p className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0" /><span className="break-all">{primaryContact.email}</span></p> : null}
                {primaryContact?.phone ? <p className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0" /><span>{primaryContact.phone}</span></p> : null}
                {primaryAddress ? <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" /><span>{primaryAddress.address_line_1}{primaryAddress.address_line_2 ? `, ${primaryAddress.address_line_2}` : ""}<br />{primaryAddress.postal_code} {primaryAddress.city}</span></p> : null}
              </div>
              {customer ? <Link className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4" href={`/clients?client=${customer.id}`}>Voir la fiche client</Link> : null}
            </section>
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-violet-50 p-2 text-violet-700"><FileText className="size-4" /></div><h2 className="font-semibold">Informations du devis</h2></div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Validité</dt><dd className="text-right font-medium">{formatDate(editor.quote.valid_until)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Début travaux</dt><dd className="text-right font-medium">{formatDate(editor.quote.execution_start_date)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Durée estimée</dt><dd className="text-right font-medium">{editor.quote.execution_duration || "À définir"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Conditions</dt><dd className="text-right font-medium">{editor.quote.payment_terms || "À définir"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Remise</dt><dd className="font-medium">{editor.quote.discount_rate_basis_points / 100} %</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Acompte</dt><dd className="font-medium">{editor.quote.deposit_rate_basis_points / 100} %</dd></div>
              </dl>
            </section>
            {!finalized ? <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 lg:col-span-2 xl:col-span-1"><p className="font-semibold">Conseil</p><p className="mt-1">Utilisez la voix pour ajouter rapidement plusieurs prestations sans quitter le devis.</p></div> : null}
          </aside>

          <section className="min-w-0 space-y-5 lg:col-start-1 xl:col-start-2">
            <QuoteWorkflowPanel company={company} compliance={compliance} customer={customer} editor={editor} />
            {!finalized ? <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"><div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">Paramètres du devis</h2><p className="text-sm text-muted-foreground">Conditions financières, adresse du chantier et notes visibles.</p></div><div className="p-4 sm:p-5"><QuoteFinancialSettingsForm action={saveQuoteFinancialSettings} addresses={customer?.addresses ?? []} depositRateBasisPoints={editor.quote.deposit_rate_basis_points} discountRateBasisPoints={editor.quote.discount_rate_basis_points} isQuoteFree={editor.quote.is_quote_free} note={editor.quote.note} paymentTerms={editor.quote.payment_terms} preparationFeeHtCents={editor.quote.preparation_fee_ht_cents} preparationFeeVatRateBasisPoints={editor.quote.preparation_fee_vat_rate_basis_points} quoteId={editor.quote.id} travelFeeApplicable={editor.quote.travel_fee_applicable} validUntil={editor.quote.valid_until} workAddressId={editor.quote.work_address_id} /></div></section> : null}
            {finalized ? <><FinalizedContent lines={editor.lines} /><section id="acceptation">{editor.quote.quote_version_id ? <QuoteAcceptancePanel acceptance={acceptance} action={recordQuoteAcceptance} quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} /> : null}</section></> : <DraftContent catalogItems={catalogItems} lines={editor.lines} quoteId={editor.quote.id} sections={editor.sections} />}
            {!finalized ? <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"><div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-semibold">Assistant texte</h2><p className="text-sm text-muted-foreground">Vous pouvez également modifier le devis par conversation.</p></div><div className="p-4 sm:p-5"><QuoteAssistant quoteId={editor.quote.id} /></div></section> : null}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-auto">
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Statut du devis</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>{statusLabel}</span></div>
              <p className="mt-3 text-sm text-muted-foreground">{!finalized ? "Ce devis peut encore être modifié avant sa finalisation." : acceptance ? "L’acceptation commerciale de ce devis a été enregistrée." : "Le devis est finalisé et attend éventuellement l’acceptation du client."}</p>
              <div className="mt-5 space-y-3 border-l border-border pl-4 text-sm">
                <div className="relative"><span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-emerald-500" /><p className="font-medium">Brouillon</p><p className="text-muted-foreground">Préparation du devis</p></div>
                <div className="relative"><span className={`absolute -left-[21px] top-1 size-2.5 rounded-full ${finalized ? "bg-blue-500" : "bg-muted-foreground/30"}`} /><p className={finalized ? "font-medium" : "text-muted-foreground"}>Finalisé</p><p className="text-muted-foreground">Numéro officiel attribué</p></div>
                <div className="relative"><span className={`absolute -left-[21px] top-1 size-2.5 rounded-full ${acceptance ? "bg-emerald-500" : "bg-muted-foreground/30"}`} /><p className={acceptance ? "font-medium" : "text-muted-foreground"}>Accepté</p><p className="text-muted-foreground">Accord du client enregistré</p></div>
              </div>
            </section>
            <TotalsCard totals={editor.totals} />
            {!finalized && compliance ? <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5"><h2 className="font-semibold">Finalisation</h2><p className="mb-4 mt-1 text-sm text-muted-foreground">Vérifiez la conformité puis attribuez le numéro définitif du devis.</p><FinalizeQuoteForm action={finalizeQuote} compliance={compliance} quoteId={editor.quote.id} /></section> : null}
            {!finalized ? <section className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:p-5"><h2 className="font-semibold">Actions</h2><p className="mb-3 mt-1 text-sm text-muted-foreground">La suppression est définitive et réservée aux brouillons.</p><DeleteDraftQuoteForm action={deleteDraftQuote} customerName={customer?.display_name ?? "ce client"} quoteId={editor.quote.id} /></section> : null}
            {finalized && acceptance ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5"><div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="size-5" /><p className="font-semibold">Devis accepté</p></div><p className="mt-2 text-sm text-emerald-900/80">L’accord du client est enregistré et conservé dans l’historique du devis.</p></section> : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
