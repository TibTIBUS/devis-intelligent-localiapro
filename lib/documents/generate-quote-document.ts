import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateQuotePdf } from "@/lib/pdf/generate-quote-pdf";
import { createRequestId, logTechnicalError, logTechnicalInfo } from "@/lib/observability/logger";
import { detectLogoMimeType, getOrganizationLogoPath, organizationAssetsBucket } from "@/lib/storage/organization-logo";
import { createAdminClient } from "@/lib/supabase/server";

export type GeneratedQuoteDocument = { documentId: string };

async function getOrganizationLogoDataUrl(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(organizationAssetsBucket)
    .download(getOrganizationLogoPath(organizationId));
  if (error || !data) return null;

  const bytes = new Uint8Array(await data.arrayBuffer());
  const contentType = detectLogoMimeType(bytes);
  if (!contentType) return null;
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

/**
 * Génère le PDF depuis le snapshot immuable de la version de devis et met à
 * jour le document stocké afin que les évolutions purement visuelles du
 * template (logo, mise en page, typographie) soient visibles au téléchargement.
 */
export async function generateAndStoreQuoteDocument(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
  versionId: string,
  context: { requestId?: string; userId?: string } = {},
): Promise<GeneratedQuoteDocument> {
  const requestId = context.requestId ?? createRequestId();
  const logContext = { organizationId, quoteId, requestId, userId: context.userId };

  const { data: version, error: versionError } = await supabase
    .from("quote_versions")
    .select("id, quote_id, quote_number, snapshot, compliance_snapshot")
    .eq("organization_id", organizationId)
    .eq("id", versionId)
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (versionError || !version) throw new Error("Version de devis introuvable.");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("organization_id", organizationId)
    .eq("quote_version_id", versionId)
    .eq("kind", "quote_pdf")
    .maybeSingle();

  logTechnicalInfo("pdf.generation_started", logContext);
  let pdf: Buffer;
  try {
    const logoDataUrl = await getOrganizationLogoDataUrl(organizationId);
    pdf = await generateQuotePdf(version.snapshot, version.compliance_snapshot, { logoDataUrl });
  } catch (error) {
    logTechnicalError("pdf.generation_failed", logContext, error);
    throw error;
  }

  const checksum = createHash("sha256").update(pdf).digest("hex");
  const path = existing?.storage_path ?? `organizations/${organizationId}/quotes/${quoteId}/${versionId}.pdf`;
  const upload = await admin.storage.from("quote-pdfs").upload(path, pdf, {
    cacheControl: "3600",
    contentType: "application/pdf",
    upsert: Boolean(existing),
  });
  if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) {
    logTechnicalError("pdf.storage_upload_failed", logContext, upload.error);
    throw new Error("Impossible d'enregistrer le PDF.");
  }

  if (existing) {
    const { error: updateError } = await admin
      .from("documents")
      .update({
        checksum_sha256: checksum,
        file_name: `${version.quote_number}.pdf`,
        file_size_bytes: pdf.byteLength,
        mime_type: "application/pdf",
        storage_path: path,
      })
      .eq("id", existing.id)
      .eq("organization_id", organizationId);
    if (updateError) {
      logTechnicalError("pdf.document_record_failed", logContext, updateError);
      throw new Error("Impossible de mettre à jour le document.");
    }
    logTechnicalInfo("pdf.generated", { ...logContext, documentId: existing.id });
    return { documentId: existing.id };
  }

  const { data: document, error: documentError } = await admin
    .from("documents")
    .insert({
      checksum_sha256: checksum,
      file_name: `${version.quote_number}.pdf`,
      file_size_bytes: pdf.byteLength,
      kind: "quote_pdf",
      mime_type: "application/pdf",
      organization_id: organizationId,
      quote_id: quoteId,
      quote_version_id: versionId,
      storage_path: path,
    })
    .select("id")
    .single();
  if (documentError || !document) {
    logTechnicalError("pdf.document_record_failed", logContext, documentError);
    await admin.storage.from("quote-pdfs").remove([path]);
    throw new Error("Impossible d'enregistrer le document.");
  }

  logTechnicalInfo("pdf.generated", { ...logContext, documentId: document.id });
  return { documentId: document.id };
}
