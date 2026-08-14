import { calculateLine } from "@/lib/calculations/quotes";
import type { CompanyLegalInformation } from "@/lib/company/queries";
import type { Customer } from "@/lib/customers/queries";
import type { Quote, QuoteLine } from "@/lib/quotes/queries";

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
    <section className="rounded-2xl border border-border bg-background p-3 shadow-sm sm:p-5" aria-labelledby="quote-preview-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold sm:text-lg" id="quote-preview-title">Aperçu du devis</h2>
          <p className="text-xs text-muted-foreground">Mis à jour après chaque action confirmée.</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
          {quote.status === "draft" ? "Brouillon" : "Finalisé"}
        </span>
      </div>

      <div className="overflow-auto rounded-xl bg-neutral-900 p-3 sm:p-4">
        <article className="mx-auto min-h-[760px] w-full min-w-[520px] max-w-[760px] bg-white px-8 py-10 text-neutral-950 shadow-2xl sm:px-10">
          <header className="flex items-start justify-between gap-8 border-b border-neutral-200 pb-7">
            <div>
              <p className="text-xl font-bold tracking-tight">{company?.legal_name ?? "Mon entreprise"}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">Devis Intelligent · Localiapro.fr</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">DEVIS</p>
              <p className="mt-1 text-sm font-semibold">{quote.quote_number ?? "Brouillon"}</p>
              <p className="mt-2 text-xs text-neutral-600">Date : {formatDate(quote.issued_on)}</p>
              <p className="text-xs text-neutral-600">Validité : {formatDate(quote.valid_until)}</p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-8 py-7 text-xs leading-5">
            <div>
              <p className="mb-2 font-semibold">Émetteur</p>
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
            <div>
              <p className="mb-2 font-semibold">Client</p>
              <p className="font-medium">{customer?.display_name ?? "Client"}</p>
              {workAddress ? (
                <>
                  <p>{workAddress.address_line_1}</p>
                  {workAddress.address_line_2 ? <p>{workAddress.address_line_2}</p> : null}
                  <p>{workAddress.postal_code} {workAddress.city}</p>
                </>
              ) : <p className="text-neutral-500">Adresse à compléter</p>}
              {primaryContact?.phone ? <p>Tél. : {primaryContact.phone}</p> : null}
              {primaryContact?.email ? <p>Email : {primaryContact.email}</p> : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-neutral-300">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Désignation</th>
                  <th className="px-2 py-2 text-right font-semibold">Qté</th>
                  <th className="px-2 py-2 font-semibold">Unité</th>
                  <th className="px-2 py-2 text-right font-semibold">PU HT</th>
                  <th className="px-3 py-2 text-right font-semibold">Total HT</th>
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
                    </tr>
                  );
                }) : (
                  <tr className="border-t border-neutral-200">
                    <td className="px-3 py-8 text-center text-neutral-500" colSpan={5}>Les lignes confirmées apparaîtront ici en direct.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-7 w-[48%] min-w-[270px] space-y-2 text-xs">
            {totals?.isComplete ? (
              <>
                <div className="flex justify-between gap-4"><span>Sous-total HT</span><span>{formatCents(totals.subtotalHtCents)}</span></div>
                {totals.discountHtCents > 0n ? <div className="flex justify-between gap-4"><span>Remise</span><span>- {formatCents(totals.discountHtCents)}</span></div> : null}
                <div className="flex justify-between gap-4 font-medium"><span>Total HT</span><span>{formatCents(totals.totalHtCents)}</span></div>
                {totals.vatBreakdown.map((vat) => (
                  <div className="flex justify-between gap-4" key={vat.vatRateBasisPoints}><span>TVA {vat.vatRateBasisPoints / 100} %</span><span>{formatCents(vat.vatCents)}</span></div>
                ))}
                <div className="flex justify-between gap-4 rounded bg-neutral-100 px-3 py-2 text-sm font-bold"><span>Total TTC</span><span>{formatCents(totals.totalTtcCents)}</span></div>
                {totals.depositCents > 0n ? <div className="flex justify-between gap-4"><span>Acompte demandé</span><span>{formatCents(totals.depositCents)}</span></div> : null}
              </>
            ) : (
              <p className="rounded bg-amber-50 px-3 py-2 text-amber-800">Totaux en attente : une ou plusieurs lignes doivent encore être chiffrées.</p>
            )}
          </div>

          {quote.payment_terms ? (
            <div className="mt-8 border-t border-neutral-200 pt-5 text-xs">
              <p className="font-semibold">Conditions de paiement</p>
              <p className="mt-1 whitespace-pre-wrap text-neutral-700">{quote.payment_terms}</p>
            </div>
          ) : null}

          <footer className="mt-10 text-center text-[10px] text-neutral-400">Aperçu du brouillon · Les données définitives sont figées lors de la finalisation.</footer>
        </article>
      </div>
    </section>
  );
}
