import { ArrowLeft, CheckCircle2, Lightbulb, Mic2, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateQuoteForm } from "@/components/quotes/quote-forms";
import { createQuote } from "@/lib/quotes/actions";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const customers = await getCustomers(supabase, organizationId);

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href="/devis"><ArrowLeft className="size-4" /> Retour aux devis</Link>
            <p className="text-sm font-medium text-primary">Création</p>
            <h1 className="text-3xl font-semibold tracking-tight">Nouveau devis</h1>
            <p className="text-sm text-muted-foreground">Choisissez le client. Vous pourrez ensuite compléter le devis manuellement ou continuer à la voix.</p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium shadow-sm hover:bg-muted" href="/clients?nouveau=1"><Plus className="size-4" /> Nouveau client</Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
          <aside className="h-fit rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Étapes</p>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span><div><p className="text-sm font-semibold">Client</p><p className="text-xs text-muted-foreground">Choisir le destinataire</p></div></div>
              <div className="flex gap-3 opacity-60"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">2</span><div><p className="text-sm font-semibold">Prestations</p><p className="text-xs text-muted-foreground">Ajouter les travaux</p></div></div>
              <div className="flex gap-3 opacity-60"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">3</span><div><p className="text-sm font-semibold">Conditions</p><p className="text-xs text-muted-foreground">TVA, acompte, validité</p></div></div>
              <div className="flex gap-3 opacity-60"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">4</span><div><p className="text-sm font-semibold">Finalisation</p><p className="text-xs text-muted-foreground">Vérifier et envoyer</p></div></div>
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><UserRound className="size-5" /></span>
              <div><h2 className="text-xl font-semibold">Choisissez un client</h2><p className="text-sm text-muted-foreground">{customers.length} client{customers.length > 1 ? "s" : ""} enregistré{customers.length > 1 ? "s" : ""}</p></div>
            </div>
            {customers.length ? <CreateQuoteForm action={createQuote} customers={customers} /> : <div className="rounded-xl border border-dashed border-border p-8 text-center"><UserRound className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Aucun client enregistré</p><p className="mt-1 text-sm text-muted-foreground">Créez votre premier client avant d’ouvrir un devis.</p><Link className="mt-4 inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground" href="/clients?nouveau=1">Créer un client</Link></div>}
          </section>

          <aside className="h-fit space-y-4">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex items-center gap-2 text-emerald-800"><Mic2 className="size-5" /><h2 className="font-semibold">Devis à la voix</h2></div>
              <p className="mt-3 text-sm leading-6 text-emerald-900/75">Une fois le devis créé, utilisez le gros bouton vocal pour ajouter vos prestations depuis votre catalogue.</p>
            </article>
            <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
              <div className="flex items-center gap-2"><Lightbulb className="size-5 text-amber-500" /><h2 className="font-semibold">Conseil</h2></div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Préparez votre catalogue avant le rendez-vous pour retrouver rapidement vos prestations et leurs prix.</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" /> Les prix sont toujours relus depuis le serveur.</p>
            </article>
          </aside>
        </div>
      </section>
    </main>
  );
}
