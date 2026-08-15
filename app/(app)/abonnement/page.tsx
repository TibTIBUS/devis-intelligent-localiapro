import { Check, CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

import { manageSubscription, startSubscription } from "@/lib/billing/actions";
import { getOrganizationBillingState, getStripePlanPricing } from "@/lib/billing/stripe";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

function formatDate(timestamp?: number | null) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(timestamp * 1000));
}

function formatAmount(cents: number | null | undefined) {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: "Actif",
    canceled: "Résilié",
    incomplete: "Paiement à finaliser",
    incomplete_expired: "Expiré",
    past_due: "Paiement en retard",
    paused: "En pause",
    trialing: "Essai gratuit",
    unpaid: "Impayé",
  };
  return status ? labels[status] ?? status : "Aucun abonnement";
}

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ annule?: string; succes?: string }> }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const configured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL);
  const params = await searchParams;
  const billing = configured ? await getOrganizationBillingState(organizationId) : { customer: null, subscription: null };
  const pricing = configured ? await getStripePlanPricing().catch(() => null) : null;
  const subscription = billing.subscription;

  const monthlyAmount = pricing?.monthly.unit_amount ?? null;
  const annualAmount = pricing?.annual.unit_amount ?? null;
  const monthlyLabel = formatAmount(monthlyAmount);
  const annualLabel = formatAmount(annualAmount);
  const annualPerMonthLabel = formatAmount(annualAmount === null ? null : Math.round(annualAmount / 12));
  const monthsSaved =
    monthlyAmount && annualAmount ? Math.round(12 - annualAmount / monthlyAmount) : 0;
  const canManage = Boolean(billing.customer && subscription);
  const trialEnd = formatDate(subscription?.trial_end);
  const currentPeriodEnd = formatDate(subscription?.current_period_end);

  const features = [
    "Devis illimités",
    "Assistant vocal Nalto",
    "Clients et catalogue illimités",
    "PDF professionnels",
    "Envoi et suivi des devis",
  ];

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto w-full max-w-6xl space-y-7">
        <header className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">NALTO PRO</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#17382D] sm:text-4xl">Un tarif simple pour faire vos devis sur le chantier.</h1>
          <p className="text-base leading-7 text-[#626A64]">Toutes les fonctionnalités essentielles de Nalto, sans limite de devis. Commencez par 14 jours d’essai gratuit.</p>
        </header>

        {params.succes === "1" ? <div className="rounded-2xl border border-[#BFD5C8] bg-[#E7F1EB] px-5 py-4 text-sm font-medium text-[#397255]">Votre demande d’abonnement a bien été prise en compte. Stripe finalise maintenant l’activation de votre essai.</div> : null}
        {params.annule === "1" ? <div className="rounded-2xl border border-[#D8CDBD] bg-[#ECE7DD] px-5 py-4 text-sm text-[#626A64]">Le paiement a été annulé. Aucun abonnement n’a été créé.</div> : null}

        {subscription ? (
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Votre abonnement</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-[#17382D]">NALTO Pro</h2>
                  <span className="rounded-full bg-[#E7F1EB] px-3 py-1 text-xs font-semibold text-[#397255]">{statusLabel(subscription.status)}</span>
                </div>
                {trialEnd && subscription.status === "trialing" ? <p className="mt-2 text-sm text-muted-foreground">Essai gratuit jusqu’au {trialEnd}.</p> : null}
                {currentPeriodEnd && subscription.status !== "trialing" ? <p className="mt-2 text-sm text-muted-foreground">Période en cours jusqu’au {currentPeriodEnd}.</p> : null}
                {subscription.cancel_at_period_end ? <p className="mt-2 text-sm font-medium text-[#B83C32]">Résiliation prévue à la fin de la période en cours.</p> : null}
              </div>
              {canManage ? <form action={manageSubscription}><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#17382D]/20 bg-white px-4 text-sm font-semibold text-[#17382D] transition hover:bg-[#ECE7DD]" type="submit"><CreditCard className="size-4" /> Gérer mon abonnement</button></form> : null}
            </div>
          </section>
        ) : null}

        {!configured ? (
          <section className="rounded-2xl border border-[#D8CDBD] bg-[#ECE7DD] p-5">
            <p className="font-semibold text-[#17382D]">Activation du paiement en cours</p>
            <p className="mt-2 text-sm leading-6 text-[#626A64]">La page tarifaire est prête, mais le secret Stripe serveur n’est pas encore configuré sur l’hébergement. Aucun paiement ne peut être déclenché tant que cette étape n’est pas terminée.</p>
          </section>
        ) : null}

        {!subscription || ["canceled", "incomplete_expired"].includes(subscription.status) ? (
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-[#17382D]/15 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold text-[#E8672E]">Mensuel</p>
              <div className="mt-3 flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight text-[#17382D]">{monthlyLabel ?? "—"}</span><span className="pb-1 text-sm text-muted-foreground">/ mois</span></div>
              <p className="mt-2 text-sm text-muted-foreground">Sans engagement annuel. Aucune facturation avant la fin de votre essai gratuit, s’il est encore en cours.</p>
              <ul className="mt-6 space-y-3">{features.map((feature) => <li className="flex items-center gap-3 text-sm" key={feature}><span className="flex size-6 items-center justify-center rounded-full bg-[#E7F1EB] text-[#397255]"><Check className="size-4" /></span>{feature}</li>)}</ul>
              <form action={startSubscription} className="mt-7"><input name="period" type="hidden" value="monthly" /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#E8672E] px-5 text-sm font-semibold text-white transition hover:bg-[#D95E27] disabled:cursor-not-allowed disabled:opacity-50" disabled={!configured} type="submit"><CreditCard className="size-4" /> S’abonner au mensuel</button></form>
            </article>

            <article className="relative rounded-3xl border-2 border-[#17382D] bg-[#17382D] p-6 text-[#F5F1E8] shadow-sm sm:p-7">
              {monthsSaved > 0 ? <span className="absolute right-5 top-5 rounded-full bg-[#E8672E] px-3 py-1 text-xs font-semibold text-white">{monthsSaved} mois offert{monthsSaved > 1 ? "s" : ""}</span> : null}
              <p className="text-sm font-semibold text-[#F5F1E8]/75">Annuel</p>
              <div className="mt-3 flex items-end gap-2"><span className="text-4xl font-semibold tracking-tight">{annualLabel ?? "—"}</span><span className="pb-1 text-sm text-[#F5F1E8]/65">/ an</span></div>
              <p className="mt-2 text-sm text-[#F5F1E8]/70">{annualPerMonthLabel ? `Soit ${annualPerMonthLabel} par mois. ` : ""}Aucune facturation avant la fin de votre essai gratuit, s’il est encore en cours.</p>
              <ul className="mt-6 space-y-3">{features.map((feature) => <li className="flex items-center gap-3 text-sm" key={feature}><span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-[#F5F1E8]"><Check className="size-4" /></span>{feature}</li>)}</ul>
              <form action={startSubscription} className="mt-7"><input name="period" type="hidden" value="annual" /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5F1E8] px-5 text-sm font-semibold text-[#17382D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!configured} type="submit"><CreditCard className="size-4" /> Choisir l’abonnement annuel</button></form>
            </article>
          </section>
        ) : null}

        <p className="text-center text-xs leading-5 text-muted-foreground">TVA non applicable, article 293 B du CGI : le montant affiché est celui qui vous est débité, sans taxe ajoutée. L’abonnement peut être géré ou résilié à tout moment depuis le portail client sécurisé Stripe.</p>
      </section>
    </main>
  );
}
