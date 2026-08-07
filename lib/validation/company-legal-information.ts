import { z } from "zod";

const optionalTrimmedText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || undefined);

const normalizedIdentifier = (length: number, message: string) =>
  z
    .string()
    .transform((value) => value.replaceAll(/\s/g, ""))
    .pipe(z.string().regex(new RegExp(`^[0-9]{${length}}$`), message));

const shareCapitalSchema = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
  .refine(
    (value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value),
    "Saisissez un montant valide, avec deux décimales maximum.",
  )
  .transform((value) => (value === "" ? undefined : Math.round(Number(value) * 100)));

export const companyLegalInformationSchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(1, "Saisissez la raison sociale ou votre nom.")
      .max(200, "La raison sociale est trop longue."),
    legalForm: z.string().trim().min(1, "Saisissez la forme juridique.").max(80, "La forme juridique est trop longue."),
    professionalInsuranceRequired: z.enum(["yes", "no"], {
      message: "Indiquez si une assurance professionnelle est obligatoire.",
    }).transform((value) => value === "yes"),
    shareCapitalCents: shareCapitalSchema,
    siren: normalizedIdentifier(9, "Le SIREN doit contenir 9 chiffres."),
    siret: normalizedIdentifier(14, "Le SIRET doit contenir 14 chiffres."),
    vatNumber: optionalTrimmedText(15, "Le numéro de TVA est trop long.").transform(
      (value) => value?.replaceAll(/\s/g, "").toUpperCase(),
    ),
    registrationCity: optionalTrimmedText(
      120,
      "La ville d’immatriculation est trop longue.",
    ),
    addressLine1: z
      .string()
      .trim()
      .min(1, "Saisissez l’adresse de l’établissement.")
      .max(200, "L’adresse est trop longue."),
    addressLine2: optionalTrimmedText(200, "Le complément d’adresse est trop long."),
    postalCode: z
      .string()
      .trim()
      .min(1, "Saisissez le code postal.")
      .max(20, "Le code postal est trop long."),
    city: z
      .string()
      .trim()
      .min(1, "Saisissez la ville.")
      .max(120, "La ville est trop longue."),
  })
  .superRefine((value, context) => {
    if (value.siret.slice(0, 9) !== value.siren) {
      context.addIssue({
        code: "custom",
        message: "Le SIRET doit commencer par le SIREN.",
        path: ["siret"],
      });
    }

    if (
      value.vatNumber &&
      !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(value.vatNumber)
    ) {
      context.addIssue({
        code: "custom",
        message: "Le numéro de TVA intracommunautaire est invalide.",
        path: ["vatNumber"],
      });
    }
  });

export type CompanyLegalInformationFormState = {
  fieldErrors?: Partial<
    Record<
      | "legalName"
      | "legalForm"
      | "professionalInsuranceRequired"
      | "shareCapitalCents"
      | "siren"
      | "siret"
      | "vatNumber"
      | "registrationCity"
      | "addressLine1"
      | "addressLine2"
      | "postalCode"
      | "city",
      string
    >
  >;
  message?: string;
  status: "error" | "idle";
};

export const initialCompanyLegalInformationFormState: CompanyLegalInformationFormState = {
  status: "idle",
};

export function getCompanyLegalInformationValues(formData: FormData) {
  return {
    legalName: formData.get("legalName"),
    legalForm: formData.get("legalForm"),
    professionalInsuranceRequired: formData.get("professionalInsuranceRequired"),
    shareCapitalCents: formData.get("shareCapital"),
    siren: formData.get("siren"),
    siret: formData.get("siret"),
    vatNumber: formData.get("vatNumber"),
    registrationCity: formData.get("registrationCity"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    postalCode: formData.get("postalCode"),
    city: formData.get("city"),
  };
}

export function getCompanyLegalInformationFieldErrors(error: z.ZodError) {
  const fields = [
    "legalName",
    "legalForm",
    "professionalInsuranceRequired",
    "shareCapitalCents",
    "siren",
    "siret",
    "vatNumber",
    "registrationCity",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "city",
  ] as const;

  return Object.fromEntries(
    fields.flatMap((field) => {
      const message = error.issues.find((issue) => issue.path[0] === field)?.message;
      return message ? [[field, message]] : [];
    }),
  ) as CompanyLegalInformationFormState["fieldErrors"];
}

export function formatShareCapital(cents: number | null) {
  if (cents === null) {
    return "";
  }

  return (cents / 100).toFixed(2).replace(".", ",");
}
