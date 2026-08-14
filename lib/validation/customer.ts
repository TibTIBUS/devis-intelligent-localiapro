import { z } from "zod";

const optionalId = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || undefined)
  .pipe(z.string().uuid().optional());

const requiredText = (maxLength: number, message: string) =>
  z.string().trim().min(1, "Ce champ est obligatoire.").max(maxLength, message);

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || undefined);

const optionalEmail = z
  .string()
  .trim()
  .max(254, "L’adresse e-mail est trop longue.")
  .transform((value) => value || undefined)
  .refine(
    (value) => value === undefined || z.email().safeParse(value).success,
    "Saisissez une adresse e-mail valide.",
  );

export const customerSchema = z.object({
  customerId: optionalId,
  displayName: requiredText(200, "Le nom du client est trop long."),
});

export const customerContactSchema = z
  .object({
    contactId: optionalId,
    customerId: z.string().uuid(),
    email: optionalEmail,
    isPrimary: z.boolean(),
    name: optionalText(200, "Le nom du contact est trop long."),
    phone: optionalText(50, "Le numéro de téléphone est trop long."),
  })
  .superRefine((value, context) => {
    if (!value.name && !value.email && !value.phone) {
      context.addIssue({
        code: "custom",
        message: "Renseignez au moins un nom, un e-mail ou un téléphone.",
        path: ["name"],
      });
    }
  });

export const customerAddressSchema = z.object({
  addressId: optionalId,
  addressLine1: requiredText(200, "L’adresse est trop longue."),
  addressLine2: optionalText(200, "Le complément d’adresse est trop long."),
  city: requiredText(120, "La ville est trop longue."),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Utilisez un code pays à deux lettres."),
  customerId: z.string().uuid(),
  isPrimary: z.boolean(),
  label: optionalText(120, "Le libellé est trop long."),
  postalCode: requiredText(20, "Le code postal est trop long."),
});

export type CustomerFormState = {
  fieldErrors?: Partial<Record<"displayName", string>>;
  message?: string;
  status: "error" | "idle";
};

export type CustomerContactFormState = {
  fieldErrors?: Partial<Record<"email" | "name" | "phone", string>>;
  message?: string;
  status: "error" | "idle";
};

export type CustomerAddressFormState = {
  fieldErrors?: Partial<
    Record<"addressLine1" | "addressLine2" | "city" | "countryCode" | "label" | "postalCode", string>
  >;
  message?: string;
  status: "error" | "idle";
};

export type CustomerDeleteFormState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialCustomerFormState: CustomerFormState = { status: "idle" };
export const initialCustomerContactFormState: CustomerContactFormState = { status: "idle" };
export const initialCustomerAddressFormState: CustomerAddressFormState = { status: "idle" };
export const initialCustomerDeleteFormState: CustomerDeleteFormState = { status: "idle" };

export function getCustomerValues(formData: FormData) {
  return {
    customerId: formData.get("customerId") ?? "",
    displayName: formData.get("displayName"),
  };
}

export function getCustomerContactValues(formData: FormData) {
  return {
    contactId: formData.get("contactId") ?? "",
    customerId: formData.get("customerId"),
    email: formData.get("email"),
    isPrimary: formData.get("isPrimary") === "on",
    name: formData.get("name"),
    phone: formData.get("phone"),
  };
}

export function getCustomerAddressValues(formData: FormData) {
  return {
    addressId: formData.get("addressId") ?? "",
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    countryCode: formData.get("countryCode"),
    customerId: formData.get("customerId"),
    isPrimary: formData.get("isPrimary") === "on",
    label: formData.get("label"),
    postalCode: formData.get("postalCode"),
  };
}

function getFieldErrors<T extends string>(error: z.ZodError, fields: readonly T[]) {
  return Object.fromEntries(
    fields.flatMap((field) => {
      const message = error.issues.find((issue) => issue.path[0] === field)?.message;
      return message ? [[field, message]] : [];
    }),
  ) as Partial<Record<T, string>>;
}

export function getCustomerFieldErrors(error: z.ZodError) {
  return getFieldErrors(error, ["displayName"] as const);
}

export function getCustomerContactFieldErrors(error: z.ZodError) {
  return getFieldErrors(error, ["email", "name", "phone"] as const);
}

export function getCustomerAddressFieldErrors(error: z.ZodError) {
  return getFieldErrors(
    error,
    ["addressLine1", "addressLine2", "city", "countryCode", "label", "postalCode"] as const,
  );
}

export const customerIdSchema = z.string().uuid();
export const customerContactIdSchema = z.string().uuid();
export const customerAddressIdSchema = z.string().uuid();
