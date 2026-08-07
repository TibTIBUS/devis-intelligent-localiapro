"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { generateQuotePdf } from "@/lib/pdf/generate-quote-pdf";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();

export async function generateQuotePdfDocument(formData: FormData) {
  const quoteId = idSchema.parse(formData.get("quoteId"));
  const versionId = idSchema.parse(formData.get("versionId"));
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

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
  if (existing) redirect(`/api/documents/${existing.id}/download`);

  const pdf = await generateQuotePdf(version.snapshot, version.compliance_snapshot);
  const checksum = createHash("sha256").update(pdf).digest("hex");
  const path = `organizations/${organizationId}/quotes/${quoteId}/${versionId}.pdf`;
  const admin = createAdminClient();
  const upload = await admin.storage.from("quote-pdfs").upload(path, pdf, {
    contentType: "application/pdf",
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) {
    throw new Error("Impossible d'enregistrer le PDF.");
  }

  const { data: document, error: documentError } = await admin
    .from("documents")
    .insert({
      organization_id: organizationId,
      quote_id: quoteId,
      quote_version_id: versionId,
      kind: "quote_pdf",
      storage_path: path,
      file_name: `${version.quote_number}.pdf`,
      mime_type: "application/pdf",
      file_size_bytes: pdf.byteLength,
      checksum_sha256: checksum,
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
      if (concurrent) redirect(`/api/documents/${concurrent.id}/download`);
    }
    await admin.storage.from("quote-pdfs").remove([path]);
    throw new Error("Impossible d'enregistrer le document.");
  }
  redirect(`/api/documents/${document.id}/download`);
}
