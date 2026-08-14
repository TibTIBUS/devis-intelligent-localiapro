import Link from "next/link";

import { QuoteEmailForm } from "@/components/quotes/quote-email-form";
import { QuoteExecutionForm } from "@/components/quotes/quote-execution-form";
import { QuoteLivePreview } from "@/components/quotes/quote-live-preview";
import { QuotePdfForm } from "@/components/quotes/quote-pdf-form";
import { QuoteRevisionForm } from "@/components/quotes/quote-revision-form";
import { getCompanyLegalInformation } from "@/lib/company/queries";
import { validateQuoteCompliance } from "@/lib/compliance/quote-compliance";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { getQuoteEditorData } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

export async function QuoteWorkflowPanel({ quoteId }: { quoteId: string }) {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) return null;

  const [editor, customers, company] = await Promise.all([
    getQuoteEditorData(supabase, organizationId, quoteId),
    getCustomers(supabase, organizationId),
    getCompanyLegalInformation(supabase, organizationId),
  ]);
  if (!editor) return null;

  const customer = customers.find((item) => item.id === editor.quote.customer_id);
  const finalized = editor.quote.status === "finalized";
  const compliance = finalized ? null : await validateQuoteCompliance(supabase, quoteId);

  return (
    <div className="space-y-5">
      <QuoteLivePreview company={company} customer={customer} lines={editor.lines} quote={editor.quote} totals={editor.totals} />

      {!finalized && compliance ? (
        compliance.valid ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm sm:p-5">
            <p className="font-semibold text-emerald-900">✓ Devis prêt à être finalisé</p>
            <p className="mt-1 text-sm text-emerald-800">Tous les éléments obligatoires sont renseignés.</p>
          </section>
        ) : (
          <section className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 shadow-sm sm:p-5" aria-labelledby="quote-blockers-title">
            <h2 className="font-semibold text-red-900" id="quote-blockers-title">Impossible de finaliser ce devis</h2>
            <p className="mt-1 text-sm text-red-800">{compliance.errors.length} élément{compliance.errors.length > 1 ? "s" : ""} à corriger avant la finalisation :</p>
            <ul className="mt-3 space-y-2 text-sm font-medium text-red-800">
              {compliance.errors.map((issue) => (
                <li className="flex gap-2" key={`${issue.code}-${issue.field}`}><span aria-hidden>●</span><span>{issue.message}</span></li>
              ))}
            </ul>
          </section>
        )
      ) : null}

      {!finalized ? (
        <section className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="font-semibold">Exécution des travaux</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ces informations seront reprises sur le devis final.</p>
          </div>
          <div className="p-4 sm:p-5">
            <QuoteExecutionForm
              executionDuration={editor.quote.execution_duration}
              executionStartDate={editor.quote.execution_start_date}
              quoteId={editor.quote.id}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="font-semibold">Actions du devis finalisé</h2>
            <p className="mt-1 text-sm text-muted-foreground">Téléchargez, envoyez ou créez une nouvelle version modifiable sans altérer l’original.</p>
          </div>
          <div className="space-y-5 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {editor.quote.quote_version_id ? <QuotePdfForm quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} /> : null}
              <QuoteRevisionForm quoteId={editor.quote.id} />
            </div>
            {customer ? <QuoteEmailForm contacts={customer.contacts} quoteId={editor.quote.id} /> : null}
            {editor.quote.revision_of_quote_id ? (
              <p className="text-sm text-muted-foreground">Ce devis est la révision n° {editor.quote.revision_number}. <Link className="font-medium text-primary underline underline-offset-4" href={`/devis/${editor.quote.revision_of_quote_id}`}>Voir le devis d’origine</Link>.</p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
