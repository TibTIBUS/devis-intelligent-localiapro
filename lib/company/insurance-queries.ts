import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyInsurance = {
  activities_covered: string | null;
  geographic_coverage: string;
  id: string;
  insurance_type: string;
  insurer_contact_details: string;
  insurer_name: string;
  policy_number: string;
  valid_from: string | null;
  valid_until: string | null;
};

export async function getCompanyInsurances(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client
    .from("company_insurances")
    .select(
      "activities_covered, geographic_coverage, id, insurance_type, insurer_contact_details, insurer_name, policy_number, valid_from, valid_until",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Impossible de charger les assurances de l’entreprise.");
  }

  return data as CompanyInsurance[];
}
