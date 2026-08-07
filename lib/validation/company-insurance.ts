import { z } from "zod";

const requiredText = (maxLength: number, message: string) =>
  z.string().trim().min(1, "Ce champ est obligatoire.").max(maxLength, message);

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || undefined);

const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.string().date("Saisissez une date valide.").optional());

export const companyInsuranceSchema = z
  .object({
    activitiesCovered: optionalText(500, "Les activités couvertes sont trop longues."),
    geographicCoverage: requiredText(500, "La couverture géographique est trop longue."),
    insuranceId: z.string().uuid().optional(),
    insuranceType: requiredText(120, "Le type d’assurance est trop long."),
    insurerContactDetails: requiredText(
      500,
      "Les coordonnées de l’assureur sont trop longues.",
    ),
    insurerName: requiredText(160, "Le nom de l’assureur est trop long."),
    policyNumber: requiredText(120, "Le numéro de police est trop long."),
    validFrom: optionalDate,
    validUntil: optionalDate,
  })
  .superRefine((value, context) => {
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      context.addIssue({
        code: "custom",
        message: "La date de fin doit être postérieure ou égale à la date de début.",
        path: ["validUntil"],
      });
    }
  });

export type CompanyInsuranceFormState = {
  fieldErrors?: Partial<
    Record<
      | "activitiesCovered"
      | "geographicCoverage"
      | "insuranceType"
      | "insurerContactDetails"
      | "insurerName"
      | "policyNumber"
      | "validFrom"
      | "validUntil",
      string
    >
  >;
  message?: string;
  status: "error" | "idle";
};

export const initialCompanyInsuranceFormState: CompanyInsuranceFormState = {
  status: "idle",
};

export type CompanyInsuranceDeleteFormState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialCompanyInsuranceDeleteFormState: CompanyInsuranceDeleteFormState = {
  status: "idle",
};

export function getCompanyInsuranceValues(formData: FormData) {
  const insuranceId = formData.get("insuranceId");

  return {
    activitiesCovered: formData.get("activitiesCovered"),
    geographicCoverage: formData.get("geographicCoverage"),
    insuranceId: typeof insuranceId === "string" && insuranceId ? insuranceId : undefined,
    insuranceType: formData.get("insuranceType"),
    insurerContactDetails: formData.get("insurerContactDetails"),
    insurerName: formData.get("insurerName"),
    policyNumber: formData.get("policyNumber"),
    validFrom: formData.get("validFrom"),
    validUntil: formData.get("validUntil"),
  };
}

export function getCompanyInsuranceFieldErrors(error: z.ZodError) {
  const fields = [
    "activitiesCovered",
    "geographicCoverage",
    "insuranceType",
    "insurerContactDetails",
    "insurerName",
    "policyNumber",
    "validFrom",
    "validUntil",
  ] as const;

  return Object.fromEntries(
    fields.flatMap((field) => {
      const message = error.issues.find((issue) => issue.path[0] === field)?.message;
      return message ? [[field, message]] : [];
    }),
  ) as CompanyInsuranceFormState["fieldErrors"];
}

export const companyInsuranceIdSchema = z.string().uuid();
