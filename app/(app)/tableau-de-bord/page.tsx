import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  return <main>Tableau de bord</main>;
}
