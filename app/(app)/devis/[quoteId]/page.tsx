import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  DeleteQuoteLineForm,
  DeleteQuoteSectionForm,
  QuoteFinancialSettingsForm,
  QuoteLineForm,
  QuoteSectionForm,
} from "@/components/quotes/quote-forms";
import { getCatalogItems } from "@/lib/catalog/queries";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { deleteQuoteLine, deleteQuoteSection, saveQuoteFinancialSettings, saveQuoteLine, saveQuoteSection } from "@/lib/quotes/actions";
import { getQuoteEditorData } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(Number(amount) / 100);
}

export default async function QuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const [editor, customers, catalogItems] = await Promise.all([getQuoteEditorData(supabase, organizationId, quoteId), getCustomers(supabase, organizationId), getCatalogItems(supabase, organizationId)]);
  if (!editor) notFound();

  const customer = customers.find((item) => item.id === editor.quote.customer_id);
  const linesBySection = new Map(editor.sections.map((section) => [section.id, editor.lines.filter((line) => line.section_id === section.id)]));
  const unsectionedLines = editor.lines.filter((line) => line.section_id === null);

  return (
    <main className="flex min-h-svh justify-center px-4 py-8 sm:px-6 sm:py-12">
      <section className="w-full max-w-4xl space-y-8">
        <div className="space-y-2"><Link className="text-sm font-medium underline" href="/devis/nouveau">Nouveau devis</Link><p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p><h1 className="text-3xl font-semibold tracking-tight">Devis de {customer?.display_name ?? "client"}</h1><p className="text-sm text-muted-foreground">Chaque enregistrement passe par le serveur ; les totaux ci-dessous sont recalculés à partir des lignes sauvegardées.</p></div>
        <QuoteFinancialSettingsForm action={saveQuoteFinancialSettings} depositRateBasisPoints={editor.quote.deposit_rate_basis_points} discountRateBasisPoints={editor.quote.discount_rate_basis_points} quoteId={editor.quote.id} />
        <section className="space-y-4 rounded-lg border border-border p-5"><h2 className="text-xl font-semibold">Totaux</h2>{editor.totals.isComplete ? <div className="space-y-2 text-sm"><div className="flex justify-between gap-4"><span>Sous-total HT</span><span>{formatCents(editor.totals.subtotalHtCents)}</span></div><div className="flex justify-between gap-4"><span>Remise HT</span><span>- {formatCents(editor.totals.discountHtCents)}</span></div><div className="flex justify-between gap-4"><span>Total HT</span><span>{formatCents(editor.totals.totalHtCents)}</span></div>{editor.totals.vatBreakdown.map((vat) => <div className="flex justify-between gap-4" key={vat.vatRateBasisPoints}><span>TVA {Number(vat.vatRateBasisPoints) / 100} %</span><span>{formatCents(vat.vatCents)}</span></div>)}<div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-semibold"><span>Total TTC</span><span>{formatCents(editor.totals.totalTtcCents)}</span></div><div className="flex justify-between gap-4"><span>Acompte demandé</span><span>{formatCents(editor.totals.depositCents)}</span></div></div> : <p className="text-sm text-muted-foreground">Total en attente : renseignez le prix HT et le taux de TVA des lignes {editor.totals.missingLineIndexes.map((index) => index + 1).join(", ")}.</p>}</section>
        <section className="space-y-4"><h2 className="text-xl font-semibold">Sections</h2><QuoteSectionForm action={saveQuoteSection} quoteId={editor.quote.id} />{editor.sections.map((section) => <article className="space-y-4 rounded-lg border border-border p-5" key={section.id}><QuoteSectionForm action={saveQuoteSection} quoteId={editor.quote.id} section={section} />{(linesBySection.get(section.id) ?? []).map((line) => <div className="space-y-3 border-t border-border pt-4" key={line.id}><QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={editor.quote.id} sections={editor.sections} /><DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={editor.quote.id} /></div>)}{(linesBySection.get(section.id) ?? []).length === 0 ? <DeleteQuoteSectionForm action={deleteQuoteSection} quoteId={editor.quote.id} sectionId={section.id} /> : null}</article>)}</section>
        <section className="space-y-4"><h2 className="text-xl font-semibold">Lignes sans section</h2>{unsectionedLines.map((line) => <article className="space-y-3 rounded-lg border border-border p-5" key={line.id}><QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} line={line} quoteId={editor.quote.id} sections={editor.sections} /><DeleteQuoteLineForm action={deleteQuoteLine} lineId={line.id} quoteId={editor.quote.id} /></article>)}<QuoteLineForm action={saveQuoteLine} catalogItems={catalogItems} quoteId={editor.quote.id} sections={editor.sections} /></section>
      </section>
    </main>
  );
}
