import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { undoLastAiQuoteAction } from "@/lib/quotes/ai-actions";
import { createClient } from "@/lib/supabase/server";
import { undoAiQuoteActionSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsed = undoAiQuoteActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 403 });

  try {
    await undoLastAiQuoteAction(supabase, organizationId, parsed.data.quoteId);
    revalidatePath(`/devis/${parsed.data.quoteId}`);
    return NextResponse.json({ message: "Le dernier ajout de l’assistant a été annulé." });
  } catch (error) {
    console.error("AI quote action undo failed", error);
    return NextResponse.json({ error: "Aucun ajout récent ne peut être annulé." }, { status: 409 });
  }
}
