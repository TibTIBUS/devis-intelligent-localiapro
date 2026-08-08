import { NextResponse } from "next/server";

import { runQuoteAssistant } from "@/lib/ai/quote-assistant";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createRequestId, logTechnicalError, logTechnicalWarning } from "@/lib/observability/logger";
import { getQuoteEditorData } from "@/lib/quotes/queries";
import { consumeAiAssistantRequestQuota } from "@/lib/security/ai-assistant-rate-limit";
import { parseBoundedAiJsonRequest } from "@/lib/security/bounded-json-request";
import { createClient } from "@/lib/supabase/server";
import { quoteAssistantRequestSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const requestBody = await parseBoundedAiJsonRequest(request);
  if (!requestBody.success) {
    return NextResponse.json({ error: requestBody.error }, { status: requestBody.status });
  }

  const quota = await consumeAiAssistantRequestQuota(claimsData.claims.sub);
  if (quota !== "allowed") {
    logTechnicalWarning("ai.assistant_request_limited", {
      requestId,
      userId: claimsData.claims.sub,
    });
    if (quota === "limited") {
      return NextResponse.json(
        { error: "Trop de demandes à l’assistant. Réessayez dans une minute." },
        { headers: { "Retry-After": "60" }, status: 429 },
      );
    }
    return NextResponse.json({ error: "L’assistant est temporairement indisponible." }, { status: 503 });
  }

  const parsed = quoteAssistantRequestSchema.safeParse(requestBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) {
    return NextResponse.json({ error: "Entreprise introuvable." }, { status: 403 });
  }

  const editor = await getQuoteEditorData(supabase, organizationId, parsed.data.quoteId);
  if (!editor) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }
  if (editor.quote.status !== "draft") {
    return NextResponse.json({ error: "Ce devis finalisé ne peut plus être modifié." }, { status: 409 });
  }

  const { data: addresses, error: addressesError } = await supabase
    .from("customer_addresses")
    .select("address_line_1, city, id, label, postal_code")
    .eq("organization_id", organizationId)
    .eq("customer_id", editor.quote.customer_id);
  if (addressesError) {
    return NextResponse.json({ error: "Impossible de charger les adresses du client." }, { status: 503 });
  }

  try {
    const result = await runQuoteAssistant({
      context: {
        lines: editor.lines.map((line) => ({
          id: line.id,
          label: line.label,
          lineKind: line.line_kind,
          quantityMilliunits: line.quantity_milliunits,
          unit: line.unit,
        })),
        quoteId: editor.quote.id,
        status: editor.quote.status,
        depositRateBasisPoints: editor.quote.deposit_rate_basis_points,
        discountRateBasisPoints: editor.quote.discount_rate_basis_points,
        note: editor.quote.note,
        paymentTerms: editor.quote.payment_terms,
        validUntil: editor.quote.valid_until,
        workAddressId: editor.quote.work_address_id,
        workAddresses: (addresses ?? []).map((address) => ({
          id: address.id,
          label: `${address.label ? `${address.label} — ` : ""}${address.address_line_1}, ${address.postal_code} ${address.city}`,
        })),
      },
      messages: parsed.data.messages,
      observability: {
        organizationId,
        quoteId: editor.quote.id,
        requestId,
        userId: claimsData.claims.sub,
      },
      organizationId,
      supabase,
    });
    return NextResponse.json(result);
  } catch (error) {
    logTechnicalError("ai.assistant_failed", {
      organizationId,
      quoteId: parsed.data.quoteId,
      requestId,
      userId: claimsData.claims.sub,
    }, error);
    return NextResponse.json(
      { error: "L’assistant est temporairement indisponible." },
      { status: 503 },
    );
  }
}
