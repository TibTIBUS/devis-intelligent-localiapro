import { redirect } from "next/navigation";

import { LegalInformationForm } from "@/components/company/legal-information-form";
import { saveCompanyLegalInformation } from "@/lib/company/actions";
import { getCompanyLegalInformation } from "@/lib/company/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function LegalInformationPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  const legalInformation = await getCompanyLegalInformation(supabase, organizationId);

  return (
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Informations légales</h1>
          <p className="text-sm text-muted-foreground">
            Ces informations seront utilisées sur vos futurs devis.
          </p>
        </div>
        <LegalInformationForm
          action={saveCompanyLegalInformation}
          legalInformation={legalInformation}
        />
      </section>
    </main>
  );
}
