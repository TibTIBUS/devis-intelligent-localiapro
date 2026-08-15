"use server";

import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import {
  getOrganizationLogoPath,
  organizationAssetsBucket,
  type LogoFormState,
  validateOrganizationLogo,
} from "@/lib/storage/organization-logo";
import { createClient } from "@/lib/supabase/server";

export async function uploadOrganizationLogo(
  previousState: LogoFormState,
  formData: FormData,
): Promise<LogoFormState> {
  void previousState;

  const validatedLogo = await validateOrganizationLogo(formData.get("logo"));

  if (!validatedLogo.success) {
    return { message: validatedLogo.message, status: "error" };
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

  const { error } = await supabase.storage
    .from(organizationAssetsBucket)
    .upload(
      getOrganizationLogoPath(organizationId),
      validatedLogo.data.file,
      {
        cacheControl: "3600",
        contentType: validatedLogo.data.contentType,
        upsert: true,
      },
    );

  if (error) {
    return {
      message: "Impossible d’enregistrer le logo pour le moment.",
      status: "error",
    };
  }

  redirect("/entreprise/logo?enregistre=1");
}
