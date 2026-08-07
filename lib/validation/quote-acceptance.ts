import { z } from "zod";

function currentParisDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export const quoteAcceptanceSchema = z.object({
  acceptedOn: z.string().date("Saisissez une date d'acceptation valide.").refine((value) => value <= currentParisDate(), "La date d'acceptation ne peut pas être future."),
  evidenceReference: z.string().trim().max(500, "La référence de preuve est trop longue.").transform((value) => value || undefined),
  evidenceType: z.enum(["signed_quote", "written_confirmation", "deposit_payment"], { message: "Sélectionnez le mode d'acceptation constaté." }),
  quoteId: z.string().uuid(),
  quoteVersionId: z.string().uuid(),
  signatoryName: z.string().trim().min(1, "Indiquez le nom du signataire.").max(200, "Le nom du signataire est trop long."),
});

export function getQuoteAcceptanceValues(formData: FormData) {
  return {
    acceptedOn: formData.get("acceptedOn"),
    evidenceReference: formData.get("evidenceReference"),
    evidenceType: formData.get("evidenceType"),
    quoteId: formData.get("quoteId"),
    quoteVersionId: formData.get("quoteVersionId"),
    signatoryName: formData.get("signatoryName"),
  };
}
