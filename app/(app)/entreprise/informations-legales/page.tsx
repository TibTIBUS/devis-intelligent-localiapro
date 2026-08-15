import { FileBadge2 } from "lucide-react";
import Link from "next/link";
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
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-primary">Entreprise</p>
            <h1 className="text-3xl font-semibold tracking-tight">Informations légales</h1>
            <p className="text-sm text-muted-foreground">Ces informations seront utilisées sur vos futurs devis.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/assurances">Assurances</Link>
            <Link className="rounded-lg border border-border bg-background px-3 py-2 font-medium hover:bg-muted" href="/entreprise/logo">Logo</Link>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><FileBadge2 className="size-5" /></span>
            <div>
              <h2 className="text-xl font-semibold">Identité de l’entreprise</h2>
              <p className="text-sm text-muted-foreground">Nom, forme juridique, SIRET et adresse figurant sur vos devis.</p>
            </div>
          </div>
          <LegalInformationForm
            action={saveCompanyLegalInformation}
            legalInformation={legalInformation}
          />
        </section>
      </section>
    </main>
  );
}
