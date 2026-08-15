import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  FileCheck2,
  FileText,
  Gauge,
  Megaphone,
  UserX,
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

function alertClass(priority: "high" | "medium") {
  return priority === "high"
    ? "border-rose-200 bg-rose-50 text-rose-900"
    : "border-amber-200 bg-amber-50 text-amber-900";
}

export default async function AdminPage() {
  if (!(await isCurrentUserAppAdmin())) notFound();

  const { abandonedSignups, alerts, organizations, sources, stats } = await getAdminDashboardData();
  const cards = [
    { icon: Users, label: "Entreprises inscrites", value: stats.totalOrganizations.toString(), detail: `+${stats.newOrganizations7d} sur 7 jours` },
    { icon: Gauge, label: "Testeurs actifs", value: stats.testingOrganizations.toString(), detail: "Au moins 1 devis créé" },
    { icon: CalendarDays, label: "Essais Stripe", value: stats.trialingSubscriptions.toString(), detail: `${stats.trialEndingSoon} se termine(nt) sous 3 jours` },
    { icon: CreditCard, label: "Abonnements actifs", value: stats.activeSubscriptions.toString(), detail: `${stats.monthlySubscriptions} mensuel · ${stats.annualSubscriptions} annuel` },
    { icon: Activity, label: "MRR", value: formatCurrency(stats.mrrCents), detail: `Conversion ${stats.conversionRate.toFixed(1)} %` },
    { icon: FileText, label: "Devis créés", value: stats.totalQuotes.toString(), detail: `${stats.finalizedQuotes} finalisés` },
    { icon: FileCheck2, label: "Actions vocales", value: stats.voiceActions.toString(), detail: "Actions IA enregistrées" },
    { icon: UserX, label: "À relancer", value: stats.inactiveTesters7d.toString(), detail: `Inactifs 7 j · ${stats.signupWithoutOrganization} inscription(s) incomplète(s)` },
  ];
  const totalSources = sources.reduce((sum, source) => sum + source.count, 0);

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">ADMIN NALTO</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[#17382D]">Tableau de bord général</h1>
          <p className="max-w-3xl text-sm leading-6 text-[#626A64]">Suivi des inscriptions, de l’activation, de l’utilisation et des abonnements. Les données Stripe sont lues en temps réel.</p>
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
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-[#17382D]">À traiter</h2>
              <p className="mt-1 text-sm text-muted-foreground">Les situations qui méritent une action ou une relance.</p>
            </div>
            <span className="rounded-full bg-[#ECE7DD] px-3 py-1 text-xs font-semibold text-[#17382D]">{alerts.length}</span>
          </div>
          {alerts.length ? (
            <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
              {alerts.map((alert) => (
                <article className={`rounded-xl border p-4 ${alertClass(alert.priority)}`} key={alert.id}>
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{alert.organizationName}</p>
                      <p className="mt-1 text-xs leading-5 opacity-80">{alert.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune alerte pour le moment.</p>}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-semibold text-[#17382D]">Acquisition</h2><p className="mt-1 text-sm text-muted-foreground">Comment les entreprises découvrent NALTO.</p></div>
              <Megaphone className="size-5 text-[#E8672E]" />
            </div>
            <div className="mt-5 space-y-4">
              {sources.map((source) => {
                const percentage = totalSources ? (source.count / totalSources) * 100 : 0;
                return (
                  <div key={source.label}>
                    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{source.label}</span><span className="text-muted-foreground">{source.count} · {percentage.toFixed(0)} %</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECE7DD]"><div className="h-full rounded-full bg-[#17382D]" style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
              {!sources.length ? <p className="text-sm text-muted-foreground">Aucune source enregistrée.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-semibold text-[#17382D]">Onboarding</h2><p className="mt-1 text-sm text-muted-foreground">Comptes et entreprises dont la configuration n’est pas terminée.</p></div>
              <UserX className="size-5 text-[#E8672E]" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#ECE7DD]/70 p-4"><p className="text-2xl font-semibold text-[#17382D]">{stats.signupWithoutOrganization}</p><p className="mt-1 text-xs text-muted-foreground">Compte sans entreprise</p></div>
              <div className="rounded-xl bg-[#ECE7DD]/70 p-4"><p className="text-2xl font-semibold text-[#17382D]">{stats.incompleteOnboarding}</p><p className="mt-1 text-xs text-muted-foreground">Entreprise non configurée</p></div>
            </div>
            {abandonedSignups.length ? (
              <div className="mt-4 divide-y divide-border rounded-xl border border-border">
                {abandonedSignups.slice(0, 5).map((signup) => (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={signup.id}>
                    <div className="min-w-0"><p className="truncate font-medium">{signup.email ?? "E-mail indisponible"}</p><p className="mt-0.5 text-xs text-muted-foreground">Inscrit le {formatDate(signup.createdAt)}</p></div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">À terminer</span>
                  </div>
                ))}
              </div>
            ) : <p className="mt-4 text-sm text-muted-foreground">Aucun compte bloqué avant la création d’entreprise.</p>}
          </section>
        </div>

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
                  <div className="min-w-0"><p className="truncate font-semibold text-[#17382D]">{organization.name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{organization.email ?? "E-mail indisponible"}</p><p className="mt-1 text-xs text-muted-foreground">{organization.trade || "Métier non renseigné"}</p></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}`}>{statusLabel(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Inscription</p><p className="mt-1 font-medium">{formatDate(organization.createdAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dernière activité</p><p className="mt-1 font-medium">{formatDate(organization.lastActivityAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Devis</p><p className="mt-1 font-medium">{organization.quoteCount} · {organization.finalizedQuoteCount} finalisés</p></div>
                  <div><p className="text-xs text-muted-foreground">Clients</p><p className="mt-1 font-medium">{organization.customerCount}</p></div>
                  <div><p className="text-xs text-muted-foreground">Voix</p><p className="mt-1 font-medium">{organization.voiceActionCount} action(s)</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="mt-1 font-medium">{organization.acquisitionSource || "—"}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${organization.onboardingComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{organization.onboardingComplete ? "Onboarding terminé" : "Onboarding incomplet"}</span>
                  {organization.subscriptionStatus === "trialing" ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Fin d’essai : {formatDate(organization.trialEnd)}</span> : null}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1350px] border-collapse text-left text-sm">
              <thead className="bg-[#ECE7DD]/60 text-xs uppercase tracking-wide text-[#626A64]">
                <tr><th className="px-5 py-3 font-semibold">Entreprise</th><th className="px-5 py-3 font-semibold">Métier</th><th className="px-5 py-3 font-semibold">Source</th><th className="px-5 py-3 font-semibold">Onboarding</th><th className="px-5 py-3 font-semibold">Dernière activité</th><th className="px-5 py-3 font-semibold">Devis</th><th className="px-5 py-3 font-semibold">Clients</th><th className="px-5 py-3 font-semibold">Voix</th><th className="px-5 py-3 font-semibold">Abonnement</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {organizations.map((organization) => (
                  <tr key={organization.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-[#17382D]">{organization.name}</p><p className="mt-1 text-xs text-muted-foreground">{organization.email ?? "—"}</p><p className="mt-1 text-xs text-muted-foreground">Inscrit le {formatDate(organization.createdAt)}</p></td>
                    <td className="px-5 py-4 text-muted-foreground">{organization.trade || "—"}</td>
                    <td className="px-5 py-4">{organization.acquisitionSource || "—"}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${organization.onboardingComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{organization.onboardingComplete ? "Terminé" : "Incomplet"}</span></td>
                    <td className="px-5 py-4">{formatDate(organization.lastActivityAt)}</td>
                    <td className="px-5 py-4"><span className="font-semibold">{organization.quoteCount}</span><span className="ml-1 text-xs text-muted-foreground">({organization.finalizedQuoteCount} finalisés)</span></td>
                    <td className="px-5 py-4">{organization.customerCount}</td>
                    <td className="px-5 py-4">{organization.voiceActionCount}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}`}>{statusLabel(organization.subscriptionStatus, organization.cancelAtPeriodEnd)}</span><p className="mt-1 text-xs text-muted-foreground">{organization.activePlan === "annual" ? "Annuel" : organization.activePlan === "monthly" ? "Mensuel" : organization.subscriptionStatus === "trialing" ? `jusqu’au ${formatDate(organization.trialEnd)}` : ""}</p></td>
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
