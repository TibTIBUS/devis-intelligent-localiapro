"use server";

import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getInitialOrganizationValues,
  getOrganizationFieldErrors,
  initialOrganizationSchema,
  type OrganizationFormState,
} from "@/lib/validation/organization";

export async function createInitialOrganization(
  previousState: OrganizationFormState,
  formData: FormData,
): Promise<OrganizationFormState> {
  void previousState;

  const parsed = initialOrganizationSchema.safeParse(
    getInitialOrganizationValues(formData),
  );

  if (!parsed.success) {
    return {
      fieldErrors: getOrganizationFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  const existingOrganizationId = await getCurrentOrganizationId(supabase);

  if (existingOrganizationId) {
    redirect("/tableau-de-bord");
  }

  const { error } = await supabase.rpc("create_initial_organization", {
    organization_acquisition_source: parsed.data.acquisitionSource ?? "",
    organization_name: parsed.data.name,
    organization_trade: parsed.data.trade,
  });

  if (error) {
    return {
      message: "Impossible de créer votre entreprise pour le moment.",
      status: "error",
    };
  }

  redirect("/entreprise/logo");
}
