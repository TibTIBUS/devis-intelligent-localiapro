import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { TrialBanner } from "@/components/billing/trial-banner";
import { AppNav } from "@/components/layout/app-nav";
import { getOrganizationAccessStatus } from "@/lib/billing/access";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  const { data: admin } = await supabase.from("app_admins").select("user_id").limit(1).maybeSingle();
  const organizationId = await getCurrentOrganizationId(supabase);
  const access = organizationId ? await getOrganizationAccessStatus(supabase, organizationId) : null;

  return (
    <>
      <AppNav isAdmin={Boolean(admin)} />
      {access && (access.trialExpired || access.reminder) ? (
        <TrialBanner daysRemaining={access.trialDaysRemaining} expired={access.trialExpired} />
      ) : null}
      {children}
    </>
  );
}
