import Link from "next/link";
import { redirect } from "next/navigation";

import { getQuoteDashboard } from "@/lib/dashboard/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { commercialStatusLabel } from "@/lib/quotes/commercial-status";
import { createClient } from "@/lib/supabase/server";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(Number(amount) / 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const dashboard = await getQuoteDashboard(supabase, organizationId);

  return (
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-4xl space-y-8">
        <div className="space-y-3"><p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p><h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1><p className="text-sm text-muted-foreground">Suivez les devis de votre entreprise sans modifier leurs données commerciales.</p><div className="flex flex-wrap gap-4"><Link className="text-sm font-medium underline" href="/devis/nouveau">Créer un devis</Link><Link className="text-sm font-medium underline" href="/devis">Voir tous les devis</Link></div></div>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-lg border border-border p-5"><p className="text-sm text-muted-foreground">À accepter</p><p className="mt-2 text-3xl font-semibold">{dashboard.pendingAcceptanceCount}</p><p className="mt-1 text-sm text-muted-foreground">{formatCents(dashboard.pendingAcceptanceTtcCents)} TTC</p></article><article className="rounded-lg border border-border p-5"><p className="text-sm text-muted-foreground">Acceptés</p><p className="mt-2 text-3xl font-semibold">{dashboard.acceptedCount}</p><p className="mt-1 text-sm text-muted-foreground">{formatCents(dashboard.acceptedTtcCents)} TTC</p></article><article className="rounded-lg border border-border p-5"><p className="text-sm text-muted-foreground">Expirés</p><p className="mt-2 text-3xl font-semibold">{dashboard.expiredCount}</p></article><article className="rounded-lg border border-border p-5"><p className="text-sm text-muted-foreground">Brouillons</p><p className="mt-2 text-3xl font-semibold">{dashboard.draftCount}</p></article></section>
        <section className="space-y-4 rounded-lg border border-border p-5"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold">Derniers devis</h2><Link className="text-sm font-medium underline" href="/devis">Tous les devis</Link></div>{dashboard.recentQuotes.length ? <div className="space-y-3">{dashboard.recentQuotes.map((quote) => <article className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3" key={quote.id}><div><p className="font-medium">{quote.quoteNumber ? `${quote.quoteNumber} — ` : ""}{quote.customerName}</p><p className="text-sm text-muted-foreground">{commercialStatusLabel[quote.commercialStatus]}{quote.totals.isComplete ? ` — ${formatCents(quote.totals.totalTtcCents)} TTC` : " — montant à compléter"}</p></div><Link className="text-sm font-medium underline" href={`/devis/${quote.id}`}>Ouvrir</Link></article>)}</div> : <p className="text-sm text-muted-foreground">Créez votre premier devis pour commencer le suivi.</p>}</section>
      </section>
    </main>
  );
}
