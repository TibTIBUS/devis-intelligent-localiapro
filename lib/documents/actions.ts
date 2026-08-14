"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { generateAndStoreQuoteDocument } from "@/lib/documents/generate-quote-document";
import { createRequestId } from "@/lib/observability/logger";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

export async function generateQuotePdfDocument(formData: FormData) {
  const requestId = createRequestId();
  const quoteId = idSchema.parse(formData.get("quoteId"));
  const versionId = idSchema.parse(formData.get("versionId"));
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { documentId } = await generateAndStoreQuoteDocument(
    supabase,
    organizationId,
    quoteId,
    versionId,
    { requestId, userId: claims.claims.sub },
  );
  redirect(`/api/documents/${documentId}/download`);
}
