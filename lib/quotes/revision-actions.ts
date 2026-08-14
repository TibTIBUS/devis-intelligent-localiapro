"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const schema = z.string().uuid();

export async function createQuoteRevision(formData: FormData) {
  const quoteId = schema.parse(formData.get("quoteId"));
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_quote_revision", {
    p_actor_user_id: claims.claims.sub,
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });
  if (error || !data) throw new Error("Impossible de créer une nouvelle version modifiable de ce devis.");
  redirect(`/devis/${data}`);
}
