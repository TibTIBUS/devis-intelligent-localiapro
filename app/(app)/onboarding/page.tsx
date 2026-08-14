import { Building2, CheckCircle2, FileBadge2, Image, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AppBrand } from "@/components/layout/app-brand";
import { InitialOrganizationForm } from "@/components/organization/initial-organization-form";
import { createInitialOrganization } from "@/lib/organizations/actions";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (organizationId) redirect("/tableau-de-bord");

  const steps = [
    { icon: Building2, label: "Entreprise", active: true },
    { icon: Image, label: "Logo", active: false },
    { icon: FileBadge2, label: "Informations légales", active: false },
    { icon: ShieldCheck, label: "Assurances", active: false },
  ];

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8"><AppBrand href="/" /></div>
        <div className="grid overflow-hidden rounded-3xl border border-border bg-background shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="bg-slate-950 p-7 text-white sm:p-8">
            <p className="text-sm font-medium text-emerald-400">Bienvenue</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Configurez votre entreprise.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">Quelques informations suffisent pour préparer vos premiers devis professionnels.</p>
            <div className="mt-8 space-y-5">
              {steps.map(({ active, icon: Icon, label }, index) => (
                <div className={`flex items-center gap-3 ${active ? "text-white" : "text-slate-400"}`} key={label}>
                  <span className={`flex size-9 items-center justify-center rounded-full ${active ? "bg-emerald-500 text-white" : "bg-white/10"}`}><Icon className="size-4" /></span>
                  <div><p className="text-sm font-medium">{index + 1}. {label}</p>{active ? <p className="text-xs text-emerald-300">Étape actuelle</p> : null}</div>
                </div>
              ))}
            </div>
          </aside>

          <section className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-xl space-y-7">
              <div className="space-y-2"><p className="text-sm font-medium text-primary">Étape 1 sur 4</p><h2 className="text-3xl font-semibold tracking-tight">Votre activité</h2><p className="text-sm leading-6 text-muted-foreground">Renseignez les informations essentielles. Vous pourrez les compléter et les modifier ensuite.</p></div>
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6"><InitialOrganizationForm action={createInitialOrganization} /></div>
              <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Vos données restent rattachées à votre organisation et protégées par les règles d’accès de l’application.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
