"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import { getQuoteFieldErrors, type QuoteFormState } from "@/lib/validation/quote";
import { getQuoteAcceptanceValues, quoteAcceptanceSchema } from "@/lib/validation/quote-acceptance";

function getSnapshotValidUntil(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("quote" in snapshot)) return null;
  const quote = snapshot.quote;
  if (!quote || typeof quote !== "object" || !("validUntil" in quote)) return null;
  return typeof quote.validUntil === "string" ? quote.validUntil : null;
}

export async function recordQuoteAcceptance(previousState: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  void previousState;
  const parsed = quoteAcceptanceSchema.safeParse(getQuoteAcceptanceValues(formData));
  if (!parsed.success) return { fieldErrors: getQuoteFieldErrors(parsed.error), message: "Vérifiez les informations saisies.", status: "error" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: version, error: versionError } = await supabase
    .from("quote_versions")
    .select("id, issued_on, snapshot")
    .eq("organization_id", organizationId)
    .eq("quote_id", parsed.data.quoteId)
    .eq("id", parsed.data.quoteVersionId)
    .maybeSingle();
  if (versionError || !version) return { message: "La version finalisée du devis est introuvable.", status: "error" };
  const validUntil = getSnapshotValidUntil(version.snapshot);
  if (!validUntil || parsed.data.acceptedOn < version.issued_on || parsed.data.acceptedOn > validUntil) {
    return { message: "La date d'acceptation doit être comprise dans la période de validité du devis.", status: "error" };
  }

  const { error } = await supabase.from("quote_acceptances").insert({
    accepted_on: parsed.data.acceptedOn,
    evidence_reference: parsed.data.evidenceReference ?? null,
    evidence_type: parsed.data.evidenceType,
    organization_id: organizationId,
    quote_id: parsed.data.quoteId,
    quote_version_id: parsed.data.quoteVersionId,
    recorded_by: claims.claims.sub,
    signatory_name: parsed.data.signatoryName,
  });
  if (error) return { message: error.code === "23505" ? "L'acceptation de ce devis est déjà enregistrée." : "Impossible d'enregistrer l'acceptation.", status: "error" };

  revalidatePath(`/devis/${parsed.data.quoteId}`);
  revalidatePath("/devis");
  return { message: "Acceptation enregistrée de manière immuable.", status: "success" };
}
