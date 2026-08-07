import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { addCatalogQuoteLineFromAi } from "@/lib/quotes/ai-actions";
import { createClient } from "@/lib/supabase/server";
import { confirmAiQuoteLineSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsed = confirmAiQuoteLineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vérifiez la quantité, la nature et le taux de TVA." }, { status: 400 });
  }

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 403 });

  try {
    const result = await addCatalogQuoteLineFromAi(
      supabase,
      organizationId,
      parsed.data.quoteId,
      {
        ...parsed.data.proposal,
        vatRateBasisPoints: parsed.data.vatRate,
      },
    );
    revalidatePath(`/devis/${parsed.data.quoteId}`);
    return NextResponse.json({
      message: `« ${result.label} » a été ajouté au devis depuis votre catalogue.`,
    });
  } catch (error) {
    console.error("AI quote line confirmation failed", error);
    return NextResponse.json({ error: "La prestation n’a pas pu être ajoutée." }, { status: 409 });
  }
}
