import { calculateLine } from "@/lib/calculations/quotes";
import type { CompanyLegalInformation } from "@/lib/company/queries";
import type { Customer } from "@/lib/customers/queries";
import type { Quote, QuoteLine } from "@/lib/quotes/queries";
import { QuoteLiveLineDelete } from "@/components/quotes/quote-live-line-delete";

type QuoteTotals = Awaited<ReturnType<typeof import("@/lib/quotes/queries").getQuoteEditorData>> extends infer Editor
  ? Editor extends { totals: infer Totals }
    ? Totals
    : never
  : never;

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(Number(amount) / 100);
}

function formatDate(value: string | null) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}

function formatQuantity(quantityMilliunits: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(quantityMilliunits / 1_000);
}

export function QuoteLivePreview({
  company,
  customer,
  lines,
  quote,
  totals,
}: {
  company: CompanyLegalInformation | null;
  customer: Customer | undefined;
  lines: QuoteLine[];
  quote: Quote;
  totals: QuoteTotals;
}) {
  const primaryContact = customer?.contacts.find((contact) => contact.is_primary) ?? customer?.contacts[0];
  const workAddress = customer?.addresses.find((address) => address.id === quote.work_address_id)
    ?? customer?.addresses.find((address) => address.is_primary)
    ?? customer?.addresses[0];

  return (
    <section className="rounded-2xl border border-border bg-background p-2.5 shadow-sm sm:p-5" aria-labelledby="quote-preview-title">
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4 sm:items-center">
        <div>
          <h2 className="text-base font-semibold sm:text-lg" id="quote-preview-title">Aperçu du devis</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">Mis à jour automatiquement après chaque action.</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800 sm:px-3 sm:text-xs">
          {quote.status === "draft" ? "Brouillon" : "Finalisé"}
        </span>
      </div>

      <div className="rounded-xl bg-neutral-900 p-1.5 sm:p-4">
        <article className="mx-auto w-full max-w-[760px] bg-white px-3 py-4 text-neutral-950 shadow-2xl sm:min-h-[760px] sm:px-10 sm:py-10">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-neutral-200 pb-4 sm:gap-8 sm:pb-7">
            <div className="min-w-0">
              <p className="break-words text-sm font-bold tracking-tight sm:text-xl">{company?.legal_name ?? "Mon entreprise"}</p>
              <p className="mt-1 break-words text-[8px] font-medium uppercase tracking-[0.1em] text-neutral-500 sm:text-[11px] sm:tracking-[0.16em]">Devis Intelligent · Localiapro.fr</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold sm:text-2xl">DEVIS</p>
              <p className="mt-0.5 text-[11px] font-semibold sm:mt-1 sm:text-sm">{quote.quote_number ?? "Brouillon"}</p>
              <p className="mt-1 text-[9px] text-neutral-600 sm:mt-2 sm:text-xs">Date : {formatDate(quote.issued_on)}</p>
              <p className="text-[9px] text-neutral-600 sm:text-xs">Validité : {formatDate(quote.valid_until)}</p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 py-4 text-[9px] leading-4 sm:gap-8 sm:py-7 sm:text-xs sm:leading-5">
            <div className="min-w-0 break-words">
              <p className="mb-1 font-semibold sm:mb-2">Émetteur</p>
              <p className="font-medium">{company?.legal_name ?? "Informations entreprise à compléter"}</p>
              {company ? (
                <>
                  <p>{company.address_line_1}</p>
                  {company.address_line_2 ? <p>{company.address_line_2}</p> : null}
                  <p>{company.postal_code} {company.city}</p>
                  <p>SIRET : {company.siret}</p>
                </>
              ) : null}
            </div>
            <div className="min-w-0 break-words">
              <p className="mb-1 font-semibold sm:mb-2">Client</p>
              <p className="font-medium">{customer?.display_name ?? "Client"}</p>
              {workAddress ? (
                <>
                  <p>{workAddress.address_line_1}</p>
                  {workAddress.address_line_2 ? <p>{workAddress.address_line_2}</p> : null}
                  <p>{workAddress.postal_code} {workAddress.city}</p>
                </>
              ) : <p className="text-neutral-500">Adresse à compléter</p>}
              {primaryContact?.phone ? <p>Tél. : {primaryContact.phone}</p> : null}
              {primaryContact?.email ? <p className="break-all">Email : {primaryContact.email}</p> : null}
            </div>
          </div>

          <div className="space-y-2 sm:hidden">
            {lines.length > 0 ? lines.map((line) => {
              const lineTotal = calculateLine(BigInt(line.quantity_milliunits), line.unit_price_ht_cents === null ? null : BigInt(line.unit_price_ht_cents));
              return (
                <article className="relative rounded-md border border-neutral-300 p-2.5 pr-10 text-[9px]" key={line.id}>
                  {quote.status === "draft" ? (
                    <div className="absolute right-2 top-2">
                      <QuoteLiveLineDelete label={line.label} lineId={line.id} quoteId={quote.id} />
                    </div>
                  ) : null}
                  <p className="font-semibold">{line.label}</p>
                  {line.description ? <p className="mt-0.5 text-[8px] text-neutral-500">{line.description}</p> : null}
                  <div className="mt-2 grid grid-cols-4 gap-1.5 border-t border-neutral-200 pt-2 text-center">
                    <div><p className="text-[7px] uppercase text-neutral-500">Qté</p><p className="font-medium">{formatQuantity(line.quantity_milliunits)}</p></div>
                    <div><p className="text-[7px] uppercase text-neutral-500">Unité</p><p className="font-medium">{line.unit}</p></div>
                    <div><p className="text-[7px] uppercase text-neutral-500">PU HT</p><p className="font-medium">{line.unit_price_ht_cents === null ? "—" : formatCents(BigInt(line.unit_price_ht_cents))}</p></div>
                    <div><p className="text-[7px] uppercase text-neutral-500">Total HT</p><p className="font-semibold">{lineTotal === null ? "—" : formatCents(lineTotal)}</p></div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-md border border-neutral-300 px-3 py-5 text-center text-[9px] text-neutral-500">Les lignes ajoutées apparaîtront ici en direct.</div>
            )}
          </div>

          <div className="hidden overflow-hidden rounded-md border border-neutral-300 sm:block">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Désignation</th>
                  <th className="px-2 py-2 text-right font-semibold">Qté</th>
                  <th className="px-2 py-2 font-semibold">Unité</th>
                  <th className="px-2 py-2 text-right font-semibold">PU HT</th>
                  <th className="px-3 py-2 text-right font-semibold">Total HT</th>
                  {quote.status === "draft" ? <th className="w-10 px-2 py-2" aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {lines.length > 0 ? lines.map((line) => {
                  const lineTotal = calculateLine(BigInt(line.quantity_milliunits), line.unit_price_ht_cents === null ? null : BigInt(line.unit_price_ht_cents));
                  return (
                    <tr className="border-t border-neutral-200 align-top" key={line.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{line.label}</p>
                        {line.description ? <p className="mt-0.5 text-[10px] text-neutral-500">{line.description}</p> : null}
                      </td>
                      <td className="px-2 py-2.5 text-right">{formatQuantity(line.quantity_milliunits)}</td>
                      <td className="px-2 py-2.5">{line.unit}</td>
                      <td className="px-2 py-2.5 text-right">{line.unit_price_ht_cents === null ? "—" : formatCents(BigInt(line.unit_price_ht_cents))}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{lineTotal === null ? "—" : formatCents(lineTotal)}</td>
                      {quote.status === "draft" ? (
                        <td className="px-2 py-2 text-right">
                          <QuoteLiveLineDelete label={line.label} lineId={line.id} quoteId={quote.id} />
                        </td>
                      ) : null}
                    </tr>
                  );
                }) : (
                  <tr className="border-t border-neutral-200">
                    <td className="px-3 py-8 text-center text-neutral-500" colSpan={quote.status === "draft" ? 6 : 5}>Les lignes ajoutées apparaîtront ici en direct.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 w-full space-y-1.5 text-[9px] sm:mt-7 sm:w-[48%] sm:min-w-[270px] sm:space-y-2 sm:text-xs">
            {totals?.isComplete ? (
              <>
                <div className="flex justify-between gap-4"><span>Sous-total HT</span><span>{formatCents(totals.subtotalHtCents)}</span></div>
                {totals.discountHtCents > 0n ? <div className="flex justify-between gap-4"><span>Remise</span><span>- {formatCents(totals.discountHtCents)}</span></div> : null}
                <div className="flex justify-between gap-4 font-medium"><span>Total HT</span><span>{formatCents(totals.totalHtCents)}</span></div>
                {totals.vatBreakdown.map((vat) => (
                  <div className="flex justify-between gap-4" key={vat.vatRateBasisPoints}><span>TVA {vat.vatRateBasisPoints / 100} %</span><span>{formatCents(vat.vatCents)}</span></div>
                ))}
                <div className="flex justify-between gap-4 rounded bg-neutral-100 px-2.5 py-2 text-xs font-bold sm:px-3 sm:text-sm"><span>Total TTC</span><span>{formatCents(totals.totalTtcCents)}</span></div>
                {totals.depositCents > 0n ? <div className="flex justify-between gap-4"><span>Acompte demandé</span><span>{formatCents(totals.depositCents)}</span></div> : null}
              </>
            ) : (
              <p className="rounded bg-amber-50 px-3 py-2 text-amber-800">Totaux en attente : une ou plusieurs lignes doivent encore être chiffrées.</p>
            )}
          </div>

          {quote.payment_terms ? (
            <div className="mt-5 border-t border-neutral-200 pt-3 text-[9px] sm:mt-8 sm:pt-5 sm:text-xs">
              <p className="font-semibold">Conditions de paiement</p>
              <p className="mt-1 whitespace-pre-wrap text-neutral-700">{quote.payment_terms}</p>
            </div>
          ) : null}

          <footer className="mt-6 text-center text-[8px] text-neutral-400 sm:mt-10 sm:text-[10px]">Aperçu du brouillon · Les données définitives sont figées lors de la finalisation.</footer>
        </article>
      </div>
    </section>
  );
}
