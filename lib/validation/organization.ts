import { z } from "zod";

export const initialOrganizationSchema = z.object({
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
  fieldErrors?: Partial<Record<"name" | "trade", string>>;
  message?: string;
  status: "error" | "idle";
};

export const initialOrganizationFormState: OrganizationFormState = {
  status: "idle",
};

export function getInitialOrganizationValues(formData: FormData) {
  return {
    name: formData.get("name"),
    trade: formData.get("trade"),
  };
}

export function getOrganizationFieldErrors(
  error: z.ZodError,
): OrganizationFormState["fieldErrors"] {
  const getMessage = (field: "name" | "trade") =>
    error.issues.find((issue) => issue.path[0] === field)?.message;

  return {
    name: getMessage("name"),
    trade: getMessage("trade"),
  };
}
