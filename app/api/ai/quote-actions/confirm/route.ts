import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import {
  addCatalogQuoteLineFromAi,
  deleteQuoteLineFromAi,
  updateQuoteLineFromAi,
  updateQuoteMetadataFromAi,
} from "@/lib/quotes/ai-actions";
import { createClient } from "@/lib/supabase/server";
import { confirmAiQuoteActionSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsed = confirmAiQuoteActionSchema.safeParse(await request.json().catch(() => null));
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
    console.error("AI quote line confirmation failed", error);
    return NextResponse.json({ error: "L’action n’a pas pu être appliquée au devis." }, { status: 409 });
  }
}
