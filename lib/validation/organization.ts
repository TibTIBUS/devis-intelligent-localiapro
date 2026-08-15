import { z } from "zod";

export const initialOrganizationSchema = z.object({
  acquisitionSource: z
    .string()
    .trim()
    .max(80, "La source d’acquisition est trop longue.")
    .transform((value) => value || undefined),
  name: z
    .string()
    .trim()
    .min(2, "Saisissez le nom de votre entreprise.")
    .max(120, "Le nom de l’entreprise est trop long."),
  trade: z
    .string()
    .trim()
    .min(2, "Indiquez votre activité ou votre métier.")
    .max(80, "Le métier est trop long."),
});

export type OrganizationFormState = {
  fieldErrors?: Partial<Record<"acquisitionSource" | "name" | "trade", string>>;
  message?: string;
  status: "error" | "idle";
};

export const initialOrganizationFormState: OrganizationFormState = {
  status: "idle",
};

export function getInitialOrganizationValues(formData: FormData) {
  return {
    acquisitionSource: formData.get("acquisitionSource"),
    name: formData.get("name"),
    trade: formData.get("trade"),
  };
}

export function getOrganizationFieldErrors(
  error: z.ZodError,
): OrganizationFormState["fieldErrors"] {
  const getMessage = (field: "acquisitionSource" | "name" | "trade") =>
    error.issues.find((issue) => issue.path[0] === field)?.message;

  return {
    acquisitionSource: getMessage("acquisitionSource"),
    name: getMessage("name"),
    trade: getMessage("trade"),
  };
}
