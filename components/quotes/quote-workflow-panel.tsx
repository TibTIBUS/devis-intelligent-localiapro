import Link from "next/link";

import { QuoteEmailForm } from "@/components/quotes/quote-email-form";
import { QuoteExecutionForm } from "@/components/quotes/quote-execution-form";
import { QuoteLivePreview } from "@/components/quotes/quote-live-preview";
import { QuotePdfForm } from "@/components/quotes/quote-pdf-form";
import { QuoteRevisionForm } from "@/components/quotes/quote-revision-form";
import type { CompanyLegalInformation } from "@/lib/company/queries";
import type { QuoteComplianceResult } from "@/lib/compliance/quote-compliance";
import type { Customer } from "@/lib/customers/queries";
import type { getQuoteEditorData } from "@/lib/quotes/queries";

type QuoteEditorData = NonNullable<Awaited<ReturnType<typeof getQuoteEditorData>>>;

export function QuoteWorkflowPanel({
  company,
  compliance,
  customer,
  editor,
}: {
  company: CompanyLegalInformation | null;
  compliance: QuoteComplianceResult | null;
  customer: Customer | undefined;
  editor: QuoteEditorData;
}) {
  const finalized = editor.quote.status === "finalized";

  return (
    <div className="space-y-5">
      <QuoteLivePreview
        company={company}
        customer={customer}
        lines={editor.lines}
        quote={editor.quote}
        totals={editor.totals}
      />

      {!finalized && compliance ? (
        compliance.valid ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm sm:p-5">
            <p className="font-semibold text-emerald-900">✓ Devis prêt à être finalisé</p>
            <p className="mt-1 text-sm text-emerald-800">Tous les éléments obligatoires sont renseignés.</p>
          </section>
        ) : (
          <section
            aria-labelledby="quote-blockers-title"
            className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 shadow-sm sm:p-5"
          >
            <h2 className="font-semibold text-red-900" id="quote-blockers-title">Impossible de finaliser ce devis</h2>
            <p className="mt-1 text-sm text-red-800">
              {compliance.errors.length} élément{compliance.errors.length > 1 ? "s" : ""} à corriger avant la finalisation :
            </p>
            <ul className="mt-3 space-y-2 text-sm font-medium text-red-800">
              {compliance.errors.map((issue, index) => (
                <li className="flex gap-2" key={`${issue.code}-${issue.field}-${index}`}>
                  <span aria-hidden>●</span><span>{issue.message}</span>
                </li>
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
              {editor.quote.quote_version_id ? (
                <QuotePdfForm quoteId={editor.quote.id} versionId={editor.quote.quote_version_id} />
              ) : null}
              <QuoteRevisionForm quoteId={editor.quote.id} />
            </div>
            {customer ? <QuoteEmailForm contacts={customer.contacts} quoteId={editor.quote.id} /> : null}
            {editor.quote.revision_of_quote_id ? (
              <p className="text-sm text-muted-foreground">
                Ce devis est la révision n° {editor.quote.revision_number}.{" "}
                <Link
                  className="font-medium text-primary underline underline-offset-4"
                  href={`/devis/${editor.quote.revision_of_quote_id}`}
                >
                  Voir le devis d’origine
                </Link>.
              </p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
