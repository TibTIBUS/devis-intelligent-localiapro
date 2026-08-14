import { Buffer } from "node:buffer";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Mic2,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCatalogItems } from "@/lib/catalog/queries";
import { getCompanyLegalInformation } from "@/lib/company/queries";
import { getCustomers } from "@/lib/customers/queries";
import { getQuoteDashboard } from "@/lib/dashboard/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { commercialStatusLabel } from "@/lib/quotes/commercial-status";
import {
  getOrganizationLogoPath,
  organizationAssetsBucket,
} from "@/lib/storage/organization-logo";
import { createClient } from "@/lib/supabase/server";

function formatCents(amount: bigint) {
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    style: "currency",
  }).format(Number(amount) / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function primaryContactLabel(customer: Awaited<ReturnType<typeof getCustomers>>[number]) {
  const contact = customer.contacts.find((item) => item.is_primary) ?? customer.contacts[0];
  return contact?.email ?? contact?.phone ?? "Coordonnées à compléter";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const [dashboard, customers, catalogItems, company, organizationResult, logoResult] = await Promise.all([
    getQuoteDashboard(supabase, organizationId),
    getCustomers(supabase, organizationId),
    getCatalogItems(supabase, organizationId),
    getCompanyLegalInformation(supabase, organizationId),
    supabase
      .from("organizations")
      .select("name, trade")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase.storage
      .from(organizationAssetsBucket)
      .download(getOrganizationLogoPath(organizationId)),
  ]);

  const organization = organizationResult.data;
  let logoDataUrl: string | null = null;
  if (logoResult.data) {
    const bytes = Buffer.from(await logoResult.data.arrayBuffer());
    logoDataUrl = `data:${logoResult.data.type || "image/png"};base64,${bytes.toString("base64")}`;
  }

  const finalizedCount =
    dashboard.acceptedCount + dashboard.pendingAcceptanceCount + dashboard.expiredCount;
  const latestDraft = dashboard.recentQuotes.find((quote) => quote.commercialStatus === "draft");
  const voiceHref = latestDraft ? `/devis/${latestDraft.id}/voix` : "/devis/nouveau";
  const companyName = company?.legal_name ?? organization?.name ?? "Mon entreprise";

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="space-y-1">
          <p className="text-sm font-medium text-primary">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d’ensemble de votre activité et accès rapides à vos outils.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-primary">Entreprise</p>
          </div>
          <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_auto] lg:items-center">
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-border bg-muted/20 p-4">
              {logoDataUrl ? (
                <div
                  aria-label={`Logo de ${companyName}`}
                  className="h-28 w-full bg-contain bg-center bg-no-repeat"
                  role="img"
                  style={{ backgroundImage: `url(${logoDataUrl})` }}
                />
              ) : (
                <div className="space-y-2 text-center text-muted-foreground">
                  <FileText className="mx-auto h-9 w-9" />
                  <p className="text-sm">Logo non renseigné</p>
                  <Link className="text-sm font-medium text-primary hover:underline" href="/entreprise/logo">
                    Ajouter un logo
                  </Link>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="truncate text-2xl font-semibold">{companyName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {organization?.trade ?? company?.legal_form ?? "Informations de l’entreprise"}
                </p>
              </div>
              {company ? (
                <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{company.address_line_1}</p>
                  <p>SIRET : {company.siret}</p>
                  <p>{company.postal_code} {company.city}</p>
                  {company.vat_number ? <p>TVA : {company.vat_number}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complétez vos informations légales pour préparer vos devis.
                </p>
              )}
            </div>

            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              href="/entreprise/informations-legales"
            >
              <Pencil className="h-4 w-4" />
              Modifier les informations
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md" href="/devis">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-blue-50 p-3 text-blue-600"><FileText className="h-5 w-5" /></span>
              <div>
                <p className="text-3xl font-semibold">{dashboard.draftCount}</p>
                <p className="text-sm text-muted-foreground">Devis en brouillon</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">Voir les devis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
          </Link>

          <Link className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md" href="/devis">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-emerald-50 p-3 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></span>
              <div>
                <p className="text-3xl font-semibold">{finalizedCount}</p>
                <p className="text-sm text-muted-foreground">Devis finalisés</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">Voir les devis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
          </Link>

          <Link className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md" href="/clients">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-violet-50 p-3 text-violet-600"><Users className="h-5 w-5" /></span>
              <div>
                <p className="text-3xl font-semibold">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Clients</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">Voir les clients <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
          </Link>

          <Link className="group rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md" href="/catalogue">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-orange-50 p-3 text-orange-600"><BookOpen className="h-5 w-5" /></span>
              <div>
                <p className="text-3xl font-semibold">{catalogItems.length}</p>
                <p className="text-sm text-muted-foreground">Prestations au catalogue</p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">Voir le catalogue <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
          </Link>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.8fr_0.8fr]">
          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Reprendre un devis</h2>
                <p className="text-sm text-muted-foreground">Vos cinq devis les plus récemment modifiés.</p>
              </div>
              <Link className="text-sm font-medium text-primary hover:underline" href="/devis">Voir tous</Link>
            </div>

            {dashboard.recentQuotes.length ? (
              <div className="overflow-hidden rounded-xl border border-border">
                {dashboard.recentQuotes.map((quote, index) => (
                  <Link
                    className={`flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-muted/60 ${index ? "border-t border-border" : ""}`}
                    href={`/devis/${quote.id}`}
                    key={quote.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {quote.quoteNumber ?? "Brouillon"} — {quote.customerName}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Modifié le {formatDateTime(quote.updatedAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {quote.totals.isComplete ? formatCents(quote.totals.totalTtcCents) : "À compléter"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{commercialStatusLabel[quote.commercialStatus]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">Créez votre premier devis pour commencer le suivi.</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Actions rapides</h2>
            <div className="mt-4 space-y-3">
              <Link className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted/60" href="/devis/nouveau">
                <span className="rounded-full bg-blue-600 p-2 text-white"><Plus className="h-4 w-4" /></span>
                <div><p className="font-medium">Nouveau devis</p><p className="text-xs text-muted-foreground">Créer un devis</p></div>
              </Link>
              <Link className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 p-3 text-white shadow-sm transition hover:opacity-95" href={voiceHref}>
                <span className="rounded-full bg-white/15 p-2"><Mic2 className="h-4 w-4" /></span>
                <div><p className="font-medium">Continuer à la voix</p><p className="text-xs text-white/80">{latestDraft ? "Reprendre un brouillon" : "Créer puis dicter un devis"}</p></div>
              </Link>
              <Link className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted/60" href="/clients?nouveau=1">
                <span className="rounded-full bg-emerald-50 p-2 text-emerald-600"><Users className="h-4 w-4" /></span>
                <div><p className="font-medium">Ajouter un client</p><p className="text-xs text-muted-foreground">Créer une fiche client</p></div>
              </Link>
              <Link className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted/60" href="/catalogue">
                <span className="rounded-full bg-orange-50 p-2 text-orange-600"><BookOpen className="h-4 w-4" /></span>
                <div><p className="font-medium">Gérer le catalogue</p><p className="text-xs text-muted-foreground">Prestations et catégories</p></div>
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Clients enregistrés</h2>
              <Link className="text-sm font-medium text-primary hover:underline" href="/clients">Voir tous</Link>
            </div>
            <div className="mt-4 divide-y divide-border">
              {customers.slice(0, 5).map((customer) => (
                <Link className="flex items-center gap-3 py-3 first:pt-0 hover:opacity-80" href={`/clients?client=${customer.id}`} key={customer.id}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {customer.display_name.slice(0, 2).toLocaleUpperCase("fr-FR")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{customer.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{primaryContactLabel(customer)}</p>
                  </div>
                </Link>
              ))}
              {!customers.length ? <p className="py-5 text-sm text-muted-foreground">Aucun client enregistré.</p> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">À accepter</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard.pendingAcceptanceCount}</p>
            <p className="mt-1 text-sm font-medium text-primary">{formatCents(dashboard.pendingAcceptanceTtcCents)} TTC</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Acceptés</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard.acceptedCount}</p>
            <p className="mt-1 text-sm font-medium text-primary">{formatCents(dashboard.acceptedTtcCents)} TTC</p>
          </article>
          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Expirés</p>
            <p className="mt-2 text-2xl font-semibold">{dashboard.expiredCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Devis arrivés à échéance</p>
          </article>
        </section>
      </div>
    </main>
  );
}
