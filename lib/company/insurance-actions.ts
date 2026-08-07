"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  companyInsuranceIdSchema,
  companyInsuranceSchema,
  getCompanyInsuranceFieldErrors,
  getCompanyInsuranceValues,
  type CompanyInsuranceDeleteFormState,
  type CompanyInsuranceFormState,
} from "@/lib/validation/company-insurance";

async function getAuthenticatedOrganizationId() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  return { organizationId, supabase };
}

export async function saveCompanyInsurance(
  previousState: CompanyInsuranceFormState,
  formData: FormData,
): Promise<CompanyInsuranceFormState> {
  void previousState;

  const parsed = companyInsuranceSchema.safeParse(getCompanyInsuranceValues(formData));

  if (!parsed.success) {
    return {
      fieldErrors: getCompanyInsuranceFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = {
    activities_covered: parsed.data.activitiesCovered ?? null,
    geographic_coverage: parsed.data.geographicCoverage,
    insurance_type: parsed.data.insuranceType,
    insurer_contact_details: parsed.data.insurerContactDetails,
    insurer_name: parsed.data.insurerName,
    policy_number: parsed.data.policyNumber,
    valid_from: parsed.data.validFrom ?? null,
    valid_until: parsed.data.validUntil ?? null,
  };

  if (parsed.data.insuranceId) {
    const { data, error } = await supabase
      .from("company_insurances")
      .update(values)
      .eq("id", parsed.data.insuranceId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        message: "Impossible de modifier cette assurance pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("company_insurances").insert({
      ...values,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message:
          error.code === "23505"
            ? "Cette assurance existe déjà pour votre entreprise."
            : "Impossible d’enregistrer cette assurance pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/entreprise/assurances?enregistre=1");
}

export async function deleteCompanyInsurance(
  previousState: CompanyInsuranceDeleteFormState,
  formData: FormData,
): Promise<CompanyInsuranceDeleteFormState> {
  void previousState;

  const insuranceId = companyInsuranceIdSchema.safeParse(formData.get("insuranceId"));

  if (!insuranceId.success) {
    return {
      message: "Impossible d’identifier cette assurance.",
      status: "error",
    };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();

  const { data, error } = await supabase
    .from("company_insurances")
    .delete()
    .eq("id", insuranceId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "Impossible de supprimer cette assurance pour le moment.",
      status: "error",
    };
  }

  revalidatePath("/entreprise/assurances");

  return {
    message: "Assurance supprimée.",
    status: "success",
  };
}
