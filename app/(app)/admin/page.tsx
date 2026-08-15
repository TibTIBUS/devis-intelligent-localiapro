import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";

import { getAdminDashboardData, isCurrentUserAppAdmin } from "@/lib/admin/queries";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(cents / 100);
}

function formatDate(value: string | number | null) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function statusLabel(status: string | null, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd) return "Résiliation prévue";
  const labels: Record<string, string> = {
    active: "Abonné",
    canceled: "Résilié",
    incomplete: "À finaliser",
    incomplete_expired: "Expiré",
    past_due: "Paiement en retard",
    paused: "En pause",
    trialing: "Essai Stripe",
    unpaid: "Impayé",
  };
  return status ? labels[status] ?? status : "Sans abonnement";
}

function statusClass(status: string | null, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd || status === "canceled") return "bg-rose-50 text-rose-700";
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "trialing") return "bg-amber-50 text-amber-700";
  if (["past_due", "unpaid"].includes(status ?? "")) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
}

export default async function AdminPage() {
  if (!(await isCurrentUserAppAdmin())) notFound();

  const { organizations, stats } = await getAdminDashboardData();
  const cards = [
    { icon: Users, label: "Entreprises inscrites", value: stats.totalOrganizations.toString(), detail: `+${stats.newOrganizations7d} sur 7 jours` },
    { icon: Gauge, label: "Testeurs actifs", value: stats.testingOrganizations.toString(), detail: "Au moins 1 devis créé" },
    { icon: CalendarDays, label: "Essais Stripe", value: stats.trialingSubscriptions.toString(), detail: "Périodes d’essai en cours" },
    { icon: CreditCard, label: "Abonnements actifs", value: stats.activeSubscriptions.toString(), detail: `${stats.monthlySubscriptions} mensuel · ${stats.annualSubscriptions} annuel` },
    { icon: Activity, label: "MRR", value: formatCurrency(stats.mrrCents), detail: `Conversion ${stats.conversionRate.toFixed(1)} %` },
    { icon: FileText, label: "Devis créés", value: stats.totalQuotes.toString(), detail: `${stats.finalizedQuotes} finalisés` },
    { icon: FileCheck2, label: "Actions vocales", value: stats.voiceActions.toString(), detail: "Actions IA enregistrées" },
    { icon: AlertTriangle, label: "À surveiller", value: (stats.cancellations + stats.pastDueSubscriptions).toString(), detail: `${stats.cancellations} résiliation(s) · ${stats.pastDueSubscriptions} paiement(s)` },
  ];

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">ADMIN NALTO</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#17382D]">Tableau de bord général</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#626A64]">Suivi des inscriptions, de l’utilisation de NALTO et des abonnements Stripe. Les chiffres Stripe sont lus en temps réel.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs NALTO">
          {cards.map(({ detail, icon: Icon, label, value }) => (
            <article className="rounded-2xl border border-border bg-white p-5 shadow-sm" key={label}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-[#17382D]">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#ECE7DD] text-[#17382D]"><Icon className="size-5" /></span>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold text-[#17382D]">Entreprises et utilisateurs</h2>
                <p className="mt-1 text-sm text-muted-foreground">{organizations.length} entreprise{organizations.length > 1 ? "s" : ""} enregistrée{organizations.length > 1 ? "s" : ""}.</p>
              </div>
              <p className="text-xs text-muted-foreground">30 derniers jours : +{stats.newOrganizations30d}</p>
            </div>
          </div>

          <div className="divide-y divide-border lg:hidden">
            {organizations.map((organization) => (
              <article className="space-y-4 p-5" key={organization.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#17382D]">{organization.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{organization.email ?? "E-mail indisponible"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{organization.trade || "Métier non renseigné"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}`}>
                    {statusLabel(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Inscription</p><p className="mt-1 font-medium">{formatDate(organization.createdAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dernière connexion</p><p className="mt-1 font-medium">{formatDate(organization.lastSignInAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Devis</p><p className="mt-1 font-medium">{organization.quoteCount} · {organization.finalizedQuoteCount} finalisés</p></div>
                  <div><p className="text-xs text-muted-foreground">Clients</p><p className="mt-1 font-medium">{organization.customerCount}</p></div>
                  <div><p className="text-xs text-muted-foreground">Voix</p><p className="mt-1 font-medium">{organization.voiceActionCount} action(s)</p></div>
                  <div><p className="text-xs text-muted-foreground">Formule</p><p className="mt-1 font-medium">{organization.activePlan === "annual" ? "Annuelle" : organization.activePlan === "monthly" ? "Mensuelle" : "—"}</p></div>
                </div>
                {organization.subscriptionStatus === "trialing" ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Fin d’essai : {formatDate(organization.trialEnd)}</p> : null}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-[#ECE7DD]/60 text-xs uppercase tracking-wide text-[#626A64]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Entreprise</th>
                  <th className="px-5 py-3 font-semibold">Métier</th>
                  <th className="px-5 py-3 font-semibold">Inscription</th>
                  <th className="px-5 py-3 font-semibold">Dernière connexion</th>
                  <th className="px-5 py-3 font-semibold">Devis</th>
                  <th className="px-5 py-3 font-semibold">Clients</th>
                  <th className="px-5 py-3 font-semibold">Voix</th>
                  <th className="px-5 py-3 font-semibold">Abonnement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-[#17382D]">{organization.name}</p><p className="mt-1 text-xs text-muted-foreground">{organization.email ?? "—"}</p></td>
                    <td className="px-5 py-4 text-muted-foreground">{organization.trade || "—"}</td>
                    <td className="px-5 py-4">{formatDate(organization.createdAt)}</td>
                    <td className="px-5 py-4">{formatDate(organization.lastSignInAt)}</td>
                    <td className="px-5 py-4"><span className="font-semibold">{organization.quoteCount}</span><span className="ml-1 text-xs text-muted-foreground">({organization.finalizedQuoteCount} finalisés)</span></td>
                    <td className="px-5 py-4">{organization.customerCount}</td>
                    <td className="px-5 py-4">{organization.voiceActionCount}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}`}>
                        {statusLabel(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {organization.activePlan === "annual" ? "Annuel" : organization.activePlan === "monthly" ? "Mensuel" : organization.subscriptionStatus === "trialing" ? `jusqu’au ${formatDate(organization.trialEnd)}` : ""}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!organizations.length ? <p className="p-10 text-center text-sm text-muted-foreground">Aucune entreprise inscrite pour le moment.</p> : null}
        </section>
      </section>
    </main>
  );
}
