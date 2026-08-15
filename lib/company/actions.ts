"use server";

import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  companyLegalInformationSchema,
  getCompanyLegalInformationFieldErrors,
  getCompanyLegalInformationValues,
  type CompanyLegalInformationFormState,
} from "@/lib/validation/company-legal-information";

export async function saveCompanyLegalInformation(
  previousState: CompanyLegalInformationFormState,
  formData: FormData,
): Promise<CompanyLegalInformationFormState> {
  void previousState;

  const parsed = companyLegalInformationSchema.safeParse(
    getCompanyLegalInformationValues(formData),
  );

  if (!parsed.success) {
    return {
      fieldErrors: getCompanyLegalInformationFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  const { error } = await supabase
    .from("company_legal_information")
    .upsert(
      {
        address_line_1: parsed.data.addressLine1,
        address_line_2: parsed.data.addressLine2 ?? null,
        city: parsed.data.city,
        legal_form: parsed.data.legalForm ?? null,
        legal_name: parsed.data.legalName,
        organization_id: organizationId,
        postal_code: parsed.data.postalCode,
        professional_insurance_required: parsed.data.professionalInsuranceRequired,
        registration_city: parsed.data.registrationCity ?? null,
        share_capital_cents: parsed.data.shareCapitalCents ?? null,
        siren: parsed.data.siren,
        siret: parsed.data.siret,
        vat_number: parsed.data.vatNumber ?? null,
      },
      { onConflict: "organization_id" },
    );

  if (error) {
    return {
      message: "Impossible d’enregistrer les informations légales pour le moment.",
      status: "error",
    };
  }

  const { error: organizationError } = await supabase
    .from("organizations")
    .update({ name: parsed.data.legalName })
    .eq("id", organizationId);

  if (organizationError) {
    return {
      message: "Les informations légales sont enregistrées, mais le nom affiché de l’entreprise n’a pas pu être synchronisé.",
      status: "error",
    };
  }

  redirect("/tableau-de-bord?informations-legales=enregistrees");
}
