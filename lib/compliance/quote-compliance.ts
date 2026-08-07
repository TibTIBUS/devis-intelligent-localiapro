import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const complianceIssueSchema = z.object({ code: z.string(), field: z.string() });
const complianceResultSchema = z.object({
  errors: z.array(complianceIssueSchema),
  rulesVersion: z.string(),
  valid: z.boolean(),
  warnings: z.array(complianceIssueSchema),
});

const issueMessages: Record<string, string> = {
  EXPIRED_VALIDITY_DATE: "La date de validité du devis est dépassée.",
  INCOMPLETE_QUOTE_LINE: "Chaque ligne doit comporter un prix HT et un taux de TVA.",
  MISSING_COMPANY_LEGAL_FORM: "Renseignez la forme juridique de l’entreprise.",
  MISSING_COMPANY_LEGAL_INFORMATION: "Complétez les informations légales de l’entreprise.",
  MISSING_INSURANCE_APPLICABILITY: "Indiquez si une assurance professionnelle est obligatoire pour votre activité.",
  MISSING_LABOR_OR_SERVICE_LINE: "Ajoutez au moins une ligne de main-d’œuvre ou de prestation.",
  MISSING_PAID_QUOTE_PRICE: "Indiquez le prix HT et la TVA de l’établissement du devis payant.",
  MISSING_QUOTE_FEE_STATUS: "Indiquez si l’établissement du devis est gratuit ou payant.",
  MISSING_QUOTE_LINE: "Ajoutez au moins une prestation au devis.",
  MISSING_REQUIRED_INSURANCE: "Ajoutez une assurance professionnelle valide à la date du devis.",
  MISSING_REGISTRATION_CITY: "Renseignez la ville d’immatriculation de la société.",
  MISSING_SHARE_CAPITAL: "Renseignez le capital social de la société.",
  MISSING_TRAVEL_FEE_DECLARATION: "Indiquez si des frais de déplacement s’appliquent.",
  MISSING_TRAVEL_FEE_LINE: "Ajoutez une ligne de déplacement chiffrée.",
  MISSING_VALIDITY_DATE: "Renseignez la durée de validité de l’offre.",
  MISSING_WORKSITE_ADDRESS: "Sélectionnez le lieu d’exécution des travaux.",
  QUOTE_NOT_FOUND: "Le devis est introuvable.",
  REGISTRATION_DETAILS_TO_CONFIRM: "Vérifiez si la ville d’immatriculation doit figurer sur vos documents commerciaux.",
  TRAVEL_FEE_DECLARATION_MISMATCH: "Le devis déclare l’absence de frais de déplacement mais contient une ligne payante.",
  VAT_STATUS_TO_CONFIRM: "Vérifiez votre régime de TVA : aucun numéro de TVA intracommunautaire n’est renseigné.",
};

export type QuoteComplianceIssue = z.infer<typeof complianceIssueSchema> & { message: string };
export type QuoteComplianceResult = {
  errors: QuoteComplianceIssue[];
  rulesVersion: string;
  valid: boolean;
  warnings: QuoteComplianceIssue[];
};

function withMessages(issues: z.infer<typeof complianceIssueSchema>[]) {
  return issues.map((issue) => ({
    ...issue,
    message: issueMessages[issue.code] ?? "Une information réglementaire doit être vérifiée.",
  }));
}

export async function validateQuoteCompliance(
  client: SupabaseClient,
  quoteId: string,
): Promise<QuoteComplianceResult> {
  const { data, error } = await client.rpc("validate_quote_compliance", { p_quote_id: quoteId });
  if (error) throw new Error("Impossible de contrôler la conformité du devis.");

  const parsed = complianceResultSchema.safeParse(data);
  if (!parsed.success) throw new Error("Le contrôle de conformité a renvoyé un résultat invalide.");

  return {
    ...parsed.data,
    errors: withMessages(parsed.data.errors),
    warnings: withMessages(parsed.data.warnings),
  };
}
