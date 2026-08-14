import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { QuoteLivePreview } from "@/components/quotes/quote-live-preview";
import { VoiceQuoteAssistant } from "@/components/voice/voice-quote-assistant";
import { getCompanyLegalInformation } from "@/lib/company/queries";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { getQuoteEditorData } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

export default async function VoiceQuoteEditorPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const [editor, customers, company] = await Promise.all([
    getQuoteEditorData(supabase, organizationId, quoteId),
    getCustomers(supabase, organizationId),
    getCompanyLegalInformation(supabase, organizationId),
  ]);
  if (!editor) notFound();

  const customer = customers.find((item) => item.id === editor.quote.customer_id);

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-3 py-4 min-[375px]:px-4 sm:px-6 sm:py-5 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link className="text-sm font-medium text-muted-foreground underline underline-offset-4" href={`/devis/${quoteId}`}>
              Revenir à l’éditeur complet
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Devis à la voix</h1>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                {editor.quote.status === "draft" ? "Brouillon" : "Finalisé"}
              </span>
            </div>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              Client : <span className="font-medium text-foreground">{customer?.display_name ?? "Client"}</span>
              {editor.quote.quote_number ? ` · ${editor.quote.quote_number}` : ""}
            </p>
          </div>

          <Link
            className="inline-flex w-full shrink-0 items-center justify-center rounded-xl bg-[#E8672E] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#D95E27] sm:w-auto"
            href={`/devis/${quoteId}`}
          >
            Terminer la saisie vocale
          </Link>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)] xl:gap-7">
          <div className="lg:sticky lg:top-24">
            <VoiceQuoteAssistant quoteId={quoteId} />
          </div>
          <QuoteLivePreview company={company} customer={customer} lines={editor.lines} quote={editor.quote} totals={editor.totals} />
        </div>
      </div>
    </main>
  );
}
