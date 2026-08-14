import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createResendClient } from "@/lib/email/resend-client";
import { generateAndStoreQuoteDocument } from "@/lib/documents/generate-quote-document";
import { logTechnicalError, type TechnicalLogContext } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/server";

export type SendQuoteDocumentByEmailResult = { documentId: string; recipientEmail: string };

/**
 * Envoie le PDF d'un devis finalisé à un contact du client, choisi
 * exclusivement parmi les contacts déjà rattachés à ce client sous RLS.
 * Ne fait jamais confiance à une adresse fournie par l'appelant : elle est
 * toujours relue en base au moment de l'envoi.
 */
export async function sendQuoteDocumentByEmail(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  contactId: string,
  observability: TechnicalLogContext = {},
): Promise<SendQuoteDocumentByEmailResult> {
  const { data: quote, error: quoteError } = await client
    .from("quotes")
    .select("customer_id, quote_number, status")
    .eq("organization_id", organizationId)
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError || !quote) throw new Error("Devis introuvable.");
  if (quote.status !== "finalized") throw new Error("Ce devis doit être finalisé avant d’être envoyé par e-mail.");

  const { data: version, error: versionError } = await client
    .from("quote_versions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError || !version) throw new Error("Version de devis introuvable.");

  const { data: contact, error: contactError } = await client
    .from("customer_contacts")
    .select("email, name")
    .eq("organization_id", organizationId)
    .eq("customer_id", quote.customer_id)
    .eq("id", contactId)
    .maybeSingle();
  if (contactError || !contact?.email) throw new Error("Ce contact n’appartient pas au client de ce devis.");

  const { documentId } = await generateAndStoreQuoteDocument(client, organizationId, quoteId, version.id, observability);

  const admin = createAdminClient();
  const { data: document, error: documentError } = await admin
    .from("documents")
    .select("storage_bucket, storage_path")
    .eq("id", documentId)
    .single();
  if (documentError || !document) throw new Error("Document introuvable.");

  const { data: pdfBlob, error: downloadError } = await admin.storage
    .from(document.storage_bucket)
    .download(document.storage_path);
  if (downloadError || !pdfBlob) throw new Error("Impossible de récupérer le PDF du devis.");
  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

  const { client: resend, fromEmail } = createResendClient();
  const { data: sent, error: sendError } = await resend.emails.send({
    attachments: [{ content: pdfBuffer, filename: `${quote.quote_number}.pdf` }],
    from: fromEmail,
    subject: `Votre devis ${quote.quote_number}`,
    text: `Bonjour${contact.name ? ` ${contact.name}` : ""},\n\nVeuillez trouver ci-joint votre devis ${quote.quote_number}.\n\nCordialement.`,
    to: contact.email,
  });
  if (sendError || !sent?.id) {
    logTechnicalError("quote.email_send_failed", { ...observability, documentId, organizationId, quoteId }, sendError);
    throw new Error("Impossible d’envoyer le devis par e-mail pour le moment.");
  }

  const { error: logError } = await admin.from("quote_document_emails").insert({
    document_id: documentId,
    organization_id: organizationId,
    quote_id: quoteId,
    recipient_email: contact.email,
    resend_message_id: sent.id,
  });
  if (logError) {
    logTechnicalError("quote.email_log_failed", { ...observability, documentId, organizationId, quoteId }, logError);
  }

  return { documentId, recipientEmail: contact.email };
}
