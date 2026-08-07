import type { SupabaseClient } from "@supabase/supabase-js";

export type QuoteAcceptance = {
  accepted_on: string;
  evidence_reference: string | null;
  evidence_type: "signed_quote" | "written_confirmation" | "deposit_payment";
  id: string;
  recorded_at: string;
  signatory_name: string;
};

export async function getQuoteAcceptance(client: SupabaseClient, organizationId: string, quoteId: string) {
  const { data, error } = await client
    .from("quote_acceptances")
    .select("accepted_on, evidence_reference, evidence_type, id, recorded_at, signatory_name")
    .eq("organization_id", organizationId)
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger l'acceptation du devis.");
  return data as QuoteAcceptance | null;
}
