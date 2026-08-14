import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { validateQuoteCompliance } from "@/lib/compliance/quote-compliance";
import { sendQuoteDocumentByEmail } from "@/lib/documents/email-actions";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createRequestId, logTechnicalError, logTechnicalWarning } from "@/lib/observability/logger";
import {
  addCatalogQuoteLineFromAi,
  deleteQuoteLineFromAi,
  setQuoteFinancialRateFromAi,
  updateQuoteLineFromAi,
  updateQuoteMetadataFromAi,
} from "@/lib/quotes/ai-actions";
import { finalizeQuoteForOrganization } from "@/lib/quotes/finalize";
import { createClient } from "@/lib/supabase/server";
import { parseBoundedAiJsonRequest } from "@/lib/security/bounded-json-request";
import { confirmAiQuoteActionSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const requestBody = await parseBoundedAiJsonRequest(request);
  if (!requestBody.success) {
    return NextResponse.json({ error: requestBody.error }, { status: requestBody.status });
  }

  const parsed = confirmAiQuoteActionSchema.safeParse(requestBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez les informations de l’action proposée." }, { status: 400 });
  }

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 403 });

  try {
    let message: string;
    if (parsed.data.actionType === "add_quote_line") {
      const result = await addCatalogQuoteLineFromAi(
        supabase,
        organizationId,
        parsed.data.quoteId,
        { ...parsed.data.proposal, vatRateBasisPoints: parsed.data.vatRate },
      );
      message = `« ${result.label} » a été ajouté au devis depuis votre catalogue.`;
    } else if (parsed.data.actionType === "update_quote_line") {
      const result = await updateQuoteLineFromAi(
        supabase,
        organizationId,
        parsed.data.quoteId,
        parsed.data.proposal,
      );
      message = `La ligne « ${result.label} » a été modifiée.`;
    } else if (parsed.data.actionType === "delete_quote_line") {
      const result = await deleteQuoteLineFromAi(
        supabase,
        organizationId,
        parsed.data.quoteId,
        parsed.data.proposal.quoteLineId,
      );
      message = `La ligne « ${result.label} » a été supprimée.`;
    } else if (parsed.data.actionType === "set_discount" || parsed.data.actionType === "set_deposit") {
      await setQuoteFinancialRateFromAi(supabase, organizationId, parsed.data.quoteId, {
        actionType: parsed.data.actionType,
        currentRateBasisPoints: parsed.data.proposal.currentRateBasisPoints,
        rateBasisPoints: parsed.data.proposal.rateBasisPoints,
      });
      message = parsed.data.actionType === "set_discount"
        ? "Le taux de remise a été enregistré et les totaux ont été recalculés par le moteur métier."
        : "Le taux d’acompte a été enregistré et son montant a été recalculé par le moteur métier.";
    } else if (parsed.data.actionType === "finalize_quote") {
      const compliance = await validateQuoteCompliance(supabase, parsed.data.quoteId);
      if (!compliance.valid) {
        logTechnicalWarning("quote.compliance_blocked_finalization", {
          organizationId,
          quoteId: parsed.data.quoteId,
          requestId,
          ruleCodes: compliance.errors.map((issue) => issue.code),
          userId: claimsData.claims.sub,
        });
        return NextResponse.json(
          { error: compliance.errors.map((issue) => issue.message).join(" ") },
          { status: 409 },
        );
      }
      const result = await finalizeQuoteForOrganization(organizationId, parsed.data.quoteId, claimsData.claims.sub);
      if (!result.success) throw new Error("La finalisation du devis a échoué.");
      revalidatePath("/devis");
      message = `Devis finalisé sous le numéro ${result.quoteNumber}.`;
    } else if (parsed.data.actionType === "send_quote_email") {
      const result = await sendQuoteDocumentByEmail(
        supabase,
        organizationId,
        parsed.data.quoteId,
        parsed.data.proposal.contactId,
        { organizationId, quoteId: parsed.data.quoteId, requestId, userId: claimsData.claims.sub },
      );
      message = `Le devis a été envoyé à ${result.recipientEmail}.`;
    } else {
      await updateQuoteMetadataFromAi(
        supabase,
        organizationId,
        parsed.data.quoteId,
        { actionType: parsed.data.actionType, ...parsed.data.proposal } as Parameters<typeof updateQuoteMetadataFromAi>[3],
      );
      const messages = {
        set_payment_terms: "Les conditions de paiement ont été enregistrées.",
        set_validity: "La date de validité a été enregistrée.",
        set_worksite_address: "L’adresse du chantier a été enregistrée.",
        update_quote_note: "La note du devis a été enregistrée.",
      } as const;
      message = messages[parsed.data.actionType];
    }
    revalidatePath(`/devis/${parsed.data.quoteId}`);
    return NextResponse.json({ message });
  } catch (error) {
    logTechnicalError("ai.action_confirmation_failed", {
      actionType: parsed.data.actionType,
      organizationId,
      quoteId: parsed.data.quoteId,
      requestId,
      userId: claimsData.claims.sub,
    }, error);
    return NextResponse.json({ error: "L’action n’a pas pu être appliquée au devis." }, { status: 409 });
  }
}
