"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createRequestId, logTechnicalError } from "@/lib/observability/logger";
import { createAdminClient, createClient } from "@/lib/supabase/server";
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

  if (quoteError || !quote) return;

  // Un devis finalisé reste immuable pour les artisans : seul un compte
  // administrateur peut le purger, pour nettoyer les devis de test.
  if (quote.status !== "draft") {
    await purgeQuoteAsAdmin(supabase, organizationId, quoteId.data);
    revalidatePath("/devis");
    redirect("/devis");
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", quoteId.data)
    .eq("status", "draft");

  if (error) return;

  revalidatePath("/devis");
}

async function purgeQuoteAsAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  quoteId: string,
) {
  const requestId = createRequestId();
  const { data, error } = await supabase.rpc("purge_quote", {
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });

  if (error) {
    logTechnicalError("quote.purge_failed", { organizationId, quoteId, requestId }, error);
    return;
  }

  const storedObjects = (data ?? []) as Array<{ bucket_id: string; object_path: string }>;
  if (storedObjects.length === 0) return;

  // Les clés étrangères ne nettoient pas le bucket : les PDF déjà générés
  // resteraient stockés indéfiniment sans cette suppression explicite.
  const admin = createAdminClient();
  const pathsByBucket = new Map<string, string[]>();
  for (const object of storedObjects) {
    pathsByBucket.set(object.bucket_id, [...(pathsByBucket.get(object.bucket_id) ?? []), object.object_path]);
  }

  for (const [bucket, paths] of pathsByBucket) {
    const { error: storageError } = await admin.storage.from(bucket).remove(paths);
    if (storageError) {
      logTechnicalError("quote.purge_storage_failed", { organizationId, quoteId, requestId }, storageError);
    }
  }
}
