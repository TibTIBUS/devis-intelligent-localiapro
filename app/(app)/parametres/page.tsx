import { Building2, CreditCard, FileBadge2, Image, Mail, Settings2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: organization } = await supabase
    .from("organizations")
    .select("name, trade")
    .eq("id", organizationId)
    .maybeSingle();

  const links = [
    { href: "/entreprise/informations-legales", icon: FileBadge2, label: "Informations légales", text: "Identité, SIRET, adresse et mentions de l’entreprise." },
    { href: "/entreprise/assurances", icon: ShieldCheck, label: "Assurances", text: "Assurances professionnelles reprises sur les devis." },
    { href: "/entreprise/logo", icon: Image, label: "Logo", text: "Logo utilisé sur les documents générés par Nalto." },
    { href: "/catalogue", icon: Building2, label: "Catalogue", text: "Prestations, unités et prix de référence de l’entreprise." },
  ] as const;

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">NALTO</p>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#17382D] text-[#F5F1E8]"><Settings2 className="size-5" /></span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#17382D]">Paramètres</h1>
              <p className="text-sm text-muted-foreground">Compte connecté et réglages principaux de votre espace.</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compte</p>
            <div className="mt-4 flex items-start gap-3">
              <span className="rounded-xl bg-secondary p-2.5 text-primary"><Mail className="size-5" /></span>
              <div className="min-w-0">
                <p className="font-semibold">Compte connecté</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">{userData.user.email ?? "Adresse e-mail non disponible"}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Espace entreprise</p>
            <div className="mt-4 flex items-start gap-3">
              <span className="rounded-xl bg-secondary p-2.5 text-primary"><Building2 className="size-5" /></span>
              <div>
                <p className="font-semibold">{organization?.name ?? "Mon entreprise"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{organization?.trade ?? "Métier à compléter"}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-background shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-primary">Configuration de l’entreprise</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ces données alimentent directement vos devis et documents.</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {links.map(({ href, icon: Icon, label, text }) => (
              <Link className="rounded-xl border border-border p-4 transition hover:border-primary/30 hover:bg-secondary/50" href={href} key={href}>
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-[#17382D] p-2 text-[#F5F1E8]"><Icon className="size-4" /></span>
                  <div><p className="font-semibold">{label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Link className="block rounded-2xl border border-[#17382D]/15 bg-[#17382D] p-5 text-[#F5F1E8] shadow-sm transition hover:bg-[#21483B]" href="/abonnement">
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-white/10 p-2.5"><CreditCard className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F5F1E8]/60">Abonnement</p>
              <p className="mt-1 font-semibold">NALTO Pro</p>
              <p className="mt-1 text-sm leading-6 text-[#F5F1E8]/70">Consultez les tarifs, commencez votre essai ou gérez votre abonnement et votre moyen de paiement.</p>
            </div>
            <span aria-hidden="true" className="text-xl text-[#E8672E]">›</span>
          </div>
        </Link>
      </section>
    </main>
  );
}
