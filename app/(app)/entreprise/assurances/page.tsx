import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InsuranceForm } from "@/components/company/insurance-form";
import {
  deleteCompanyInsurance,
  saveCompanyInsurance,
} from "@/lib/company/insurance-actions";
import { getCompanyInsurances } from "@/lib/company/insurance-queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function CompanyInsurancesPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  const insurances = await getCompanyInsurances(supabase, organizationId);

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-primary">Entreprise</p>
            <h1 className="text-3xl font-semibold tracking-tight">Assurances</h1>
            <p className="text-sm text-muted-foreground">Enregistrez les informations qui pourront être reprises sur vos devis.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/informations-legales">Informations légales</Link>
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/logo">Logo</Link>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><ShieldCheck className="size-5" /></span>
            <div>
              <h2 className="text-xl font-semibold">Ajouter une assurance</h2>
              <p className="text-sm text-muted-foreground">Assureur, police et couverture d’une garantie professionnelle.</p>
            </div>
          </div>
          <InsuranceForm action={saveCompanyInsurance} />
        </section>

        {insurances.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Assurances enregistrées</h2>
            {insurances.map((insurance) => (
              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6" key={insurance.id}>
                <InsuranceForm
                  action={saveCompanyInsurance}
                  deleteAction={deleteCompanyInsurance}
                  insurance={insurance}
                />
              </div>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
