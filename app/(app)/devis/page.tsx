import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FilePenLine,
  FileText,
  Plus,
  Search,
} from "lucide-react";

import { DeleteDraftQuoteForm } from "@/components/quotes/delete-draft-quote-form";
import { commercialStatusLabel, type CommercialQuoteStatus } from "@/lib/quotes/commercial-status";
import { deleteDraftQuote } from "@/lib/quotes/list-actions";
import { filterQuotesByCustomerName, getQuoteListData } from "@/lib/quotes/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import { quoteSearchSchema } from "@/lib/validation/quote";

const allowedStatuses = new Set<CommercialQuoteStatus | "all">([
  "all",
  "draft",
  "pending_acceptance",
  "accepted",
  "expired",
]);

const statusStyles: Record<CommercialQuoteStatus, string> = {
  accepted: "bg-[#E7EFE8] text-[#397255] ring-[#BFD5C8]",
  draft: "bg-[#ECE7DD] text-[#17382D] ring-[#D8CDBD]",
  expired: "bg-[#F6E6E3] text-[#B83C32] ring-[#E7C2BC]",
  pending_acceptance: "bg-[#F3E4D9] text-[#9A4E23] ring-[#E8C7B2]",
};

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(Number(amount) / 100);
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt));
}

function buildFilterHref(status: CommercialQuoteStatus | "all", search: string) {
  const params = new URLSearchParams();
  if (search) params.set("recherche", search);
  if (status !== "all") params.set("statut", status);
  const query = params.toString();
  return query ? `/devis?${query}` : "/devis";
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ recherche?: string; statut?: string }>;
}) {
  const { recherche = "", statut = "all" } = await searchParams;
  const parsedSearch = quoteSearchSchema.safeParse(recherche);
  const search = parsedSearch.success ? parsedSearch.data : "";
  const selectedStatus = allowedStatuses.has(statut as CommercialQuoteStatus | "all")
    ? (statut as CommercialQuoteStatus | "all")
    : "all";

  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const allQuotes = await getQuoteListData(supabase, organizationId, "");
  const searchedQuotes = filterQuotesByCustomerName(allQuotes, search);
  const quotes = selectedStatus === "all"
    ? searchedQuotes
    : searchedQuotes.filter((quote) => quote.commercialStatus === selectedStatus);

  const counts = {
    accepted: allQuotes.filter((quote) => quote.commercialStatus === "accepted").length,
    draft: allQuotes.filter((quote) => quote.commercialStatus === "draft").length,
    expired: allQuotes.filter((quote) => quote.commercialStatus === "expired").length,
    pending_acceptance: allQuotes.filter((quote) => quote.commercialStatus === "pending_acceptance").length,
  };
  const totalTtc = allQuotes.reduce(
    (sum, quote) => sum + (quote.totals.isComplete ? quote.totals.totalTtcCents : 0n),
    0n,
  );

  const filters: { label: string; status: CommercialQuoteStatus | "all"; count: number }[] = [
    { count: allQuotes.length, label: "Tous les devis", status: "all" },
    { count: counts.draft, label: "Brouillons", status: "draft" },
    { count: counts.pending_acceptance, label: "À accepter", status: "pending_acceptance" },
    { count: counts.accepted, label: "Acceptés", status: "accepted" },
    { count: counts.expired, label: "Expirés", status: "expired" },
  ];

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-primary">Localiapro.fr</p>
            <h1 className="text-3xl font-semibold tracking-tight">Devis</h1>
            <p className="text-sm text-muted-foreground">Consultez, reprenez et suivez tous les devis de votre entreprise.</p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            href="/devis/nouveau"
          >
            <Plus className="size-4" />
            Nouveau devis
          </Link>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-[#ECE7DD] p-2 text-[#17382D]"><FileText className="size-5" /></div>
            <p className="text-2xl font-semibold">{allQuotes.length}</p>
            <p className="text-sm text-muted-foreground">Tous les devis</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-[#ECE7DD] p-2 text-[#17382D]"><FilePenLine className="size-5" /></div>
            <p className="text-2xl font-semibold">{counts.draft}</p>
            <p className="text-sm text-muted-foreground">Brouillons</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-[#F3E4D9] p-2 text-[#E8672E]"><Clock3 className="size-5" /></div>
            <p className="text-2xl font-semibold">{counts.pending_acceptance}</p>
            <p className="text-sm text-muted-foreground">À accepter</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-[#E7EFE8] p-2 text-[#397255]"><CheckCircle2 className="size-5" /></div>
            <p className="text-2xl font-semibold">{counts.accepted}</p>
            <p className="text-sm text-muted-foreground">Acceptés</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-4 shadow-sm sm:col-span-2 xl:col-span-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valeur totale TTC</p>
            <p className="text-2xl font-semibold">{formatCents(totalTtc)}</p>
            <p className="text-sm text-muted-foreground">Devis chiffrés</p>
          </article>
        </section>

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit space-y-5 rounded-2xl border border-border bg-background p-4 shadow-sm lg:sticky lg:top-6">
            <form action="/devis" className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
                  defaultValue={search}
                  id="quote-search"
                  maxLength={100}
                  name="recherche"
                  placeholder="Rechercher un client..."
                  type="search"
                />
              </div>
              {selectedStatus !== "all" ? <input name="statut" type="hidden" value={selectedStatus} /> : null}
              <button className="h-9 w-full rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" type="submit">Rechercher</button>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</p>
              <nav className="space-y-1">
                {filters.map((filter) => {
                  const active = filter.status === selectedStatus;
                  return (
                    <Link
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"}`}
                      href={buildFilterHref(filter.status, search)}
                      key={filter.status}
                    >
                      <span>{filter.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{filter.count}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {(search || selectedStatus !== "all") ? (
              <Link className="block text-center text-sm font-medium text-muted-foreground underline underline-offset-4" href="/devis">Réinitialiser les filtres</Link>
            ) : null}
          </aside>

          <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Liste des devis</h2>
                <p className="text-sm text-muted-foreground">{quotes.length} devis affiché{quotes.length > 1 ? "s" : ""}</p>
              </div>
              <p className="text-xs text-muted-foreground">Les devis finalisés restent immuables.</p>
            </div>

            {quotes.length ? (
              <div className="divide-y divide-border">
                {quotes.map((quote) => (
                  <article className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/30 xl:grid-cols-[minmax(0,1.3fr)_150px_150px_auto] xl:items-center" key={quote.id}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{quote.quoteNumber ?? "Brouillon"}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[quote.commercialStatus]}`}>
                          {commercialStatusLabel[quote.commercialStatus]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{quote.customerName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Modifié le {formatUpdatedAt(quote.updatedAt)}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Total TTC</p>
                      <p className="mt-1 font-semibold">
                        {quote.totals.isComplete ? formatCents(quote.totals.totalTtcCents) : "À compléter"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Émission</p>
                      <p className="mt-1 text-sm">{quote.issuedOn ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${quote.issuedOn}T12:00:00`)) : "Non finalisé"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <Link
                        className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted"
                        href={`/devis/${quote.id}`}
                      >
                        Ouvrir
                      </Link>

                      {quote.commercialStatus === "pending_acceptance" ? (
                        <Link
                          className="inline-flex h-8 items-center rounded-lg bg-[#397255] px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
                          href={`/devis/${quote.id}#acceptation`}
                        >
                          Enregistrer l’acceptation
                        </Link>
                      ) : null}

                      {quote.commercialStatus === "draft" ? (
                        <DeleteDraftQuoteForm action={deleteDraftQuote} customerName={quote.customerName} quoteId={quote.id} />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <FileText className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">Aucun devis trouvé</p>
                <p className="mt-1 text-sm text-muted-foreground">Modifiez vos filtres ou créez un nouveau devis.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
