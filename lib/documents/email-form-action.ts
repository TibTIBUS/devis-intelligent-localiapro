"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { sendQuoteDocumentByEmail } from "@/lib/documents/email-actions";
import { createRequestId } from "@/lib/observability/logger";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

type QuoteEmailFormState = { message?: string; status: "idle" | "error" | "success" };

const schema = z.object({ contactId: z.string().uuid(), quoteId: z.string().uuid() });

export async function sendQuoteEmail(
  previousState: QuoteEmailFormState,
  formData: FormData,
): Promise<QuoteEmailFormState> {
  void previousState;
  const parsed = schema.safeParse({ contactId: formData.get("contactId"), quoteId: formData.get("quoteId") });
  if (!parsed.success) return { message: "Sélectionnez une adresse e-mail valide du client.", status: "error" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  try {
    const result = await sendQuoteDocumentByEmail(supabase, organizationId, parsed.data.quoteId, parsed.data.contactId, {
      organizationId,
      quoteId: parsed.data.quoteId,
      requestId: createRequestId(),
      userId: claims.claims.sub,
    });
    revalidatePath(`/devis/${parsed.data.quoteId}`);
    return { message: `Devis envoyé à ${result.recipientEmail}.`, status: "success" };
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Impossible d’envoyer le devis.", status: "error" };
  }
}
