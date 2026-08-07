import { redirect } from "next/navigation";

import { InitialOrganizationForm } from "@/components/organization/initial-organization-form";
import { createInitialOrganization } from "@/lib/organizations/actions";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (organizationId) {
    redirect("/tableau-de-bord");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Votre entreprise</h1>
          <p className="text-sm text-muted-foreground">
            Commençons par les informations essentielles de votre activité.
          </p>
        </div>
        <InitialOrganizationForm action={createInitialOrganization} />
      </section>
    </main>
  );
}
