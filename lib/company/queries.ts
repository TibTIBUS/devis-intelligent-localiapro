import type { SupabaseClient } from "@supabase/supabase-js";

export type CompanyLegalInformation = {
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  legal_form: string | null;
  legal_name: string;
  postal_code: string;
  professional_insurance_required: boolean | null;
  registration_city: string | null;
  share_capital_cents: number | null;
  siren: string;
  siret: string;
  vat_number: string | null;
};

export async function getCompanyLegalInformation(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client
    .from("company_legal_information")
    .select(
      "address_line_1, address_line_2, city, legal_form, legal_name, postal_code, professional_insurance_required, registration_city, share_capital_cents, siren, siret, vat_number",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error("Impossible de charger les informations légales de l’entreprise.");
  }

  return data as CompanyLegalInformation | null;
}
