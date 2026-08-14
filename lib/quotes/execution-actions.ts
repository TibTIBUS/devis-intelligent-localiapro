"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { QuoteFormState } from "@/lib/validation/quote";

const executionSchema = z.object({
  executionDuration: z.string().trim().min(1, "Indiquez la durée ou le délai prévu.").max(200, "La durée est trop longue."),
  executionStartDate: z.string().date("Saisissez une date de début valide."),
  quoteId: z.string().uuid(),
});

export async function saveQuoteExecution(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const parsed = executionSchema.safeParse({
    executionDuration: formData.get("executionDuration"),
    executionStartDate: formData.get("executionStartDate"),
    quoteId: formData.get("quoteId"),
  });
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    return { fieldErrors, message: "Vérifiez les informations d’exécution.", status: "error" };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/connexion");
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data, error } = await supabase
    .from("quotes")
    .update({
      execution_duration: parsed.data.executionDuration,
      execution_start_date: parsed.data.executionStartDate,
    })
    .eq("id", parsed.data.quoteId)
    .eq("organization_id", organizationId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error || !data) return { message: "Impossible d’enregistrer la date d’exécution.", status: "error" };
  revalidatePath(`/devis/${parsed.data.quoteId}`);
  revalidatePath(`/devis/${parsed.data.quoteId}/voix`);
  return { message: "Date et durée d’exécution enregistrées.", status: "success" };
}
