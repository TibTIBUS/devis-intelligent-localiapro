import { redirect } from "next/navigation";

import { LogoUploadForm } from "@/components/organization/logo-upload-form";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { uploadOrganizationLogo } from "@/lib/storage/actions";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationLogoPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Logo de l’entreprise</h1>
          <p className="text-sm text-muted-foreground">
            Ce logo sera utilisé sur vos prochains devis.
          </p>
        </div>
        <LogoUploadForm action={uploadOrganizationLogo} />
      </section>
    </main>
  );
}
