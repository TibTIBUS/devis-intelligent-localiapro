"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const quoteIdSchema = z.string().uuid();

export type QuoteRevisionState = {
  message?: string;
  status: "error" | "idle";
};

export const initialQuoteRevisionState: QuoteRevisionState = { status: "idle" };

export async function createQuoteRevision(
  previousState: QuoteRevisionState,
  formData: FormData,
): Promise<QuoteRevisionState> {
  void previousState;

  const parsedQuoteId = quoteIdSchema.safeParse(formData.get("quoteId"));
  if (!parsedQuoteId.success) {
    return { message: "Impossible d’identifier ce devis.", status: "error" };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_quote_revision", {
    p_actor_user_id: claims.claims.sub,
    p_organization_id: organizationId,
    p_quote_id: parsedQuoteId.data,
  });

  if (error) {
    return {
      message:
        error.code === "P0002"
          ? "Seul un devis finalisé peut être réédité."
          : "Impossible de créer une nouvelle version modifiable de ce devis.",
      status: "error",
    };
  }

  const newQuoteId = quoteIdSchema.safeParse(data);
  if (!newQuoteId.success) {
    return {
      message: "La nouvelle version du devis n’a pas pu être identifiée.",
      status: "error",
    };
  }

  redirect(`/devis/${newQuoteId.data}`);
}
