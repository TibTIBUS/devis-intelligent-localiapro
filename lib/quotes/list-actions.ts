"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import { quoteIdSchema } from "@/lib/validation/quote";

export async function deleteDraftQuote(formData: FormData) {
  const quoteId = quoteIdSchema.safeParse(formData.get("quoteId"));
  if (!quoteId.success) return;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("id", quoteId.data)
    .maybeSingle();

  if (quoteError || !quote || quote.status !== "draft") return;

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", quoteId.data)
    .eq("status", "draft");

  if (error) return;

  revalidatePath("/devis");
}
