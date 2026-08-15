import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createRequestId, logTechnicalError, logTechnicalWarning } from "@/lib/observability/logger";
import { undoLastAiQuoteAction } from "@/lib/quotes/ai-actions";
import { consumeAiRequestQuota } from "@/lib/security/ai-assistant-rate-limit";
import { createClient } from "@/lib/supabase/server";
import { parseBoundedAiJsonRequest } from "@/lib/security/bounded-json-request";
import { undoAiQuoteActionSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const requestBody = await parseBoundedAiJsonRequest(request);
  if (!requestBody.success) {
    return NextResponse.json({ error: requestBody.error }, { status: requestBody.status });
  }

  const parsed = undoAiQuoteActionSchema.safeParse(requestBody.data);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const quota = await consumeAiRequestQuota(claimsData.claims.sub, "assistant");
  if (quota !== "allowed") {
    logTechnicalWarning("ai.undo_request_limited", { requestId, userId: claimsData.claims.sub });
    if (quota === "limited") {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans une minute." },
        { headers: { "Retry-After": "60" }, status: 429 },
      );
    }
    return NextResponse.json({ error: "L’annulation est temporairement indisponible." }, { status: 503 });
  }

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 403 });

  try {
    await undoLastAiQuoteAction(supabase, organizationId, parsed.data.quoteId);
    revalidatePath(`/devis/${parsed.data.quoteId}`);
    return NextResponse.json({ message: "La dernière action de l’assistant a été annulée." });
  } catch (error) {
    logTechnicalError("ai.action_undo_failed", {
      organizationId,
      quoteId: parsed.data.quoteId,
      requestId,
      userId: claimsData.claims.sub,
    }, error);
    return NextResponse.json({ error: "Aucune action récente ne peut être annulée sans risque." }, { status: 409 });
  }
}
