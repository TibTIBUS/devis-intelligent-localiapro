import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DeleteQuoteLineForm,
  DeleteQuoteSectionForm,
  FinalizeQuoteForm,
  QuoteFinancialSettingsForm,
  QuoteLineForm,
  QuoteSectionForm,
} from "@/components/quotes/quote-forms";
import { getCatalogItems } from "@/lib/catalog/queries";
import { QuotePdfForm } from "@/components/quotes/quote-pdf-form";
import { QuoteAcceptancePanel } from "@/components/quotes/quote-acceptance-form";
import { QuoteAssistant } from "@/components/quotes/quote-assistant";
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
import { getQuoteEditorData, type QuoteLine, type QuoteSection } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(
    Number(amount) / 100,
  );
}

function DraftContent({ catalogItems, compliance, lines, quoteId, sections }: { catalogItems: Awaited<ReturnType<typeof getCatalogItems>>; compliance: QuoteComplianceResult; lines: QuoteLine[]; quoteId: string; sections: QuoteSection[] }) {
  const linesBySection = new Map(
    sections.map((section) => [section.id, lines.filter((line) => line.section_id === section.id)]),
  );
  const unsectionedLines = lines.filter((line) => line.section_id === null);

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Sections</h2>
        <QuoteSectionForm action={saveQuoteSection} quoteId={quoteId} />
        {sections.map((section) => (
          <article className="space-y-4 rounded-lg border border-border p-5" key={section.id}>
            <QuoteSectionForm action={saveQuoteSection} quoteId={quoteId} section={section} />
            {(linesBySection.get(section.id) ?? []).map((line) => (
              <div className="space-y-3 border-t border-border pt-4" key={line.id}>
                <QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={quoteId} sections={sections} />
                <DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={quoteId} />
              </div>
            ))}
            {(linesBySection.get(section.id) ?? []).length === 0 ? (
              <DeleteQuoteSectionForm action={deleteQuoteSection} quoteId={quoteId} sectionId={section.id} />
            ) : null}
          </article>
        ))}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Lignes sans section</h2>
        {unsectionedLines.map((line) => (
          <article className="space-y-3 rounded-lg border border-border p-5" key={line.id}>
            <QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={quoteId} sections={sections} />
            <DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={quoteId} />
          </article>
        ))}
        <QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} quoteId={quoteId} sections={sections} />
      </section>
      <FinalizeQuoteForm action={finalizeQuote} compliance={compliance} quoteId={quoteId} />
    </>
  );
}

function FinalizedContent({ lines }: { lines: QuoteLine[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Contenu finalisé</h2>
      {lines.map((line) => (
        <article className="rounded-lg border border-border p-4" key={line.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-medium">{line.label}</h3>
              <p className="text-sm text-muted-foreground">
                {line.quantity_milliunits / 1_000} {line.unit} × {formatCents(BigInt(line.unit_price_ht_cents ?? 0))} HT
              </p>
            </div>
            <p className="text-sm">TVA {(line.vat_rate_basis_points ?? 0) / 100} %</p>
          </div>
          {line.description ? <p className="mt-2 text-sm text-muted-foreground">{line.description}</p> : null}
        </article>
      ))}
    </section>
  );
}

export default async function QuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const [editor, customers, catalogItems, acceptance] = await Promise.all([
    getQuoteEditorData(supabase, organizationId, quoteId),
    getCustomers(supabase, organizationId),
    getCatalogItems(supabase, organizationId),
    getQuoteAcceptance(supabase, organizationId, quoteId),
  ]);
  if (!editor) notFound();
  const compliance = editor.quote.status === "draft"
    ? await validateQuoteCompliance(supabase, editor.quote.id)
    : null;
  const customer = customers.find((item) => item.id === editor.quote.customer_id);
  const finalized = editor.quote.status === "finalized";

  return (
    <main className="flex min-h-svh justify-center px-4 py-8 sm:px-6 sm:py-12">
      <section className="w-full max-w-4xl space-y-8">
        <div className="space-y-2">
          <Link className="text-sm font-medium underline" href={`/devis/${editor.quote.id}/voix`}>Continuer à la voix</Link>
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {editor.quote.quote_number ? `${editor.quote.quote_number} — ` : ""}Devis de {customer?.display_name ?? "client"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {finalized ? "Devis finalisé et immuable." : "Chaque enregistrement passe par le serveur ; les totaux sont recalculés à partir des lignes sauvegardées."}
          </p>
        </div>

        {!finalized ? (
          <QuoteFinancialSettingsForm
            action={saveQuoteFinancialSettings}
            addresses={customer?.addresses ?? []}
            depositRateBasisPoints={editor.quote.deposit_rate_basis_points}
            discountRateBasisPoints={editor.quote.discount_rate_basis_points}
            isQuoteFree={editor.quote.is_quote_free}
            note={editor.quote.note}
            paymentTerms={editor.quote.payment_terms}
            preparationFeeHtCents={editor.quote.preparation_fee_ht_cents}
            preparationFeeVatRateBasisPoints={editor.quote.preparation_fee_vat_rate_basis_points}
            quoteId={editor.quote.id}
            travelFeeApplicable={editor.quote.travel_fee_applicable}
            validUntil={editor.quote.valid_until}
            workAddressId={editor.quote.work_address_id}
          />
        ) : null}

        <section className="space-y-4 rounded-lg border border-border p-5">
          <h2 className="text-xl font-semibold">Totaux</h2>
          {editor.totals.isComplete ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4"><span>Sous-total HT</span><span>{formatCents(editor.totals.subtotalHtCents)}</span></div>
              <div className="flex justify-between gap-4"><span>Remise HT</span><span>- {formatCents(editor.totals.discountHtCents)}</span></div>
              <div className="flex justify-between gap-4"><span>Total HT</span><span>{formatCents(editor.totals.totalHtCents)}</span></div>
              {editor.totals.vatBreakdown.map((vat) => <div className="flex justify-between gap-4" key={vat.vatRateBasisPoints}><span>TVA {vat.vatRateBasisPoints / 100} %</span><span>{formatCents(vat.vatCents)}</span></div>)}
              <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold"><span>Total TTC</span><span>{formatCents(editor.totals.totalTtcCents)}</span></div>
              <div className="flex justify-between gap-4"><span>Acompte demandé</span><span>{formatCents(editor.totals.depositCents)}</span></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Total en attente : renseignez le prix HT et le taux de TVA des lignes {editor.totals.missingLineIndexes.map((index) => index + 1).join(", ")}.</p>
          )}
        </section>

        {!finalized ? <QuoteAssistant quoteId={editor.quote.id} /> : null}

        {finalized ? (
          <>
            <FinalizedContent lines={editor.lines} />
            {editor.quote.quote_version_id ? <QuotePdfForm quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} /> : null}
            {editor.quote.quote_version_id ? <QuoteAcceptancePanel acceptance={acceptance} action={recordQuoteAcceptance} quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} /> : null}
          </>
        ) : <DraftContent catalogItems={catalogItems} compliance={compliance!} lines={editor.lines} quoteId={editor.quote.id} sections={editor.sections} />}
      </section>
    </main>
  );
}
