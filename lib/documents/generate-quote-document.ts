import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { generateQuotePdf } from "@/lib/pdf/generate-quote-pdf";
import { createRequestId, logTechnicalError, logTechnicalInfo } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/server";

export type GeneratedQuoteDocument = { documentId: string };

/**
 * Génère (ou réutilise) le PDF d'une version de devis et l'enregistre comme
 * document téléchargeable. Ne redirige jamais : c'est à l'appelant (Server
 * Action liée à un formulaire, ou action d'envoi par e-mail) de décider quoi
 * faire du document généré.
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

  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("quote_version_id", versionId)
    .eq("kind", "quote_pdf")
    .maybeSingle();
  if (existing) return { documentId: existing.id };

  logTechnicalInfo("pdf.generation_started", logContext);
  let pdf: Buffer;
  try {
    pdf = await generateQuotePdf(version.snapshot, version.compliance_snapshot);
  } catch (error) {
    logTechnicalError("pdf.generation_failed", logContext, error);
    throw error;
  }
  const checksum = createHash("sha256").update(pdf).digest("hex");
  const path = `organizations/${organizationId}/quotes/${quoteId}/${versionId}.pdf`;
  const admin = createAdminClient();
  const upload = await admin.storage.from("quote-pdfs").upload(path, pdf, {
    cacheControl: "31536000",
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) {
    logTechnicalError("pdf.storage_upload_failed", logContext, upload.error);
    throw new Error("Impossible d'enregistrer le PDF.");
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
  if (documentError) {
    if (documentError.code === "23505") {
      const { data: concurrent } = await supabase
        .from("documents")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("quote_version_id", versionId)
        .eq("kind", "quote_pdf")
        .single();
      if (concurrent) return { documentId: concurrent.id };
    }
    logTechnicalError("pdf.document_record_failed", logContext, documentError);
    await admin.storage.from("quote-pdfs").remove([path]);
    throw new Error("Impossible d'enregistrer le document.");
  }
  logTechnicalInfo("pdf.generated", { ...logContext, documentId: document.id });
  return { documentId: document.id };
}
