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
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-2xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Assurances</h1>
          <p className="text-sm text-muted-foreground">
            Enregistrez les informations qui pourront être reprises sur vos devis.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ajouter une assurance</h2>
          <InsuranceForm action={saveCompanyInsurance} />
        </section>

        {insurances.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Assurances enregistrées</h2>
            {insurances.map((insurance) => (
              <InsuranceForm
                action={saveCompanyInsurance}
                deleteAction={deleteCompanyInsurance}
                insurance={insurance}
                key={insurance.id}
              />
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
