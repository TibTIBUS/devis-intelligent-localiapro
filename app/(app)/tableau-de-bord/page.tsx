import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
      <Link className="mt-6 inline-block text-sm font-medium underline" href="/entreprise/logo">
        Ajouter ou remplacer le logo de l’entreprise
      </Link>
      <Link
        className="mt-3 block text-sm font-medium underline"
        href="/entreprise/informations-legales"
      >
        Gérer les informations légales de l’entreprise
      </Link>
      <Link
        className="mt-3 block text-sm font-medium underline"
        href="/entreprise/assurances"
      >
        Gérer les assurances de l’entreprise
      </Link>
      <Link className="mt-3 block text-sm font-medium underline" href="/catalogue">
        Gérer le catalogue de prestations
      </Link>
    </main>
  );
}
