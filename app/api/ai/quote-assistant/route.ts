import { NextResponse } from "next/server";

import { runQuoteAssistant } from "@/lib/ai/quote-assistant";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { getQuoteEditorData } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";
import { quoteAssistantRequestSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const parsed = quoteAssistantRequestSchema.safeParse(await request.json().catch(() => null));
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

  try {
    const message = await runQuoteAssistant({
      context: {
        lineLabels: editor.lines.map((line) => line.label),
        quoteId: editor.quote.id,
        status: editor.quote.status,
      },
      messages: parsed.data.messages,
      organizationId,
      supabase,
    });
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Quote assistant failed", error);
    return NextResponse.json(
      { error: "L’assistant est temporairement indisponible." },
      { status: 503 },
    );
  }
}
