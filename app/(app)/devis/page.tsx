import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { getQuoteListData } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";
import { quoteSearchSchema } from "@/lib/validation/quote";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(Number(amount) / 100);
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(updatedAt));
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ recherche?: string }> }) {
  const { recherche = "" } = await searchParams;
  const parsedSearch = quoteSearchSchema.safeParse(recherche);
  const search = parsedSearch.success ? parsedSearch.data : "";
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const quotes = await getQuoteListData(supabase, organizationId, search);

  return (
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-3"><p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p><h1 className="text-3xl font-semibold tracking-tight">Devis enregistrés</h1><p className="text-sm text-muted-foreground">Retrouvez et reprenez les devis de votre entreprise.</p><Link className="inline-block text-sm font-medium underline" href="/devis/nouveau">Créer un devis</Link></div>
        <form action="/devis" className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="quote-search">Rechercher un client</label><input className="h-10 min-w-52 flex-1 rounded-md border border-input bg-background px-3 text-sm" defaultValue={search} id="quote-search" maxLength={100} name="recherche" placeholder="Rechercher par client" type="search" /><button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">Rechercher</button></form>
        {quotes.length ? <section className="space-y-3">{quotes.map((quote) => <article className="space-y-2 rounded-lg border border-border p-5" key={quote.id}><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Devis de {quote.customerName}</h2><span className="text-sm text-muted-foreground">Modifié le {formatUpdatedAt(quote.updatedAt)}</span></div>{quote.totals.isComplete ? <p className="text-sm text-muted-foreground">Total TTC : {formatCents(quote.totals.totalTtcCents)}</p> : <p className="text-sm text-muted-foreground">Total en attente : prix HT ou TVA à compléter.</p>}<Link className="inline-block text-sm font-medium underline" href={`/devis/${quote.id}`}>Ouvrir le devis</Link></article>)}</section> : <p className="rounded-lg border border-border p-5 text-sm text-muted-foreground">{search ? "Aucun devis ne correspond à cette recherche." : "Aucun devis enregistré pour le moment."}</p>}
      </section>
    </main>
  );
}
