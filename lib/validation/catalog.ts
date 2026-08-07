import { z } from "zod";

const optionalText = (maxLength: number, message: string) =>
  z
    .string()
    .trim()
    .max(maxLength, message)
    .transform((value) => value || undefined);

const requiredText = (maxLength: number, message: string) =>
  z.string().trim().min(1, "Ce champ est obligatoire.").max(maxLength, message);

const optionalId = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.string().uuid().optional());

const priceCentsSchema = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
  .refine(
    (value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value),
    "Saisissez un prix valide, avec deux décimales maximum.",
  )
  .transform((value) => (value === "" ? undefined : Math.round(Number(value) * 100)))
  .refine(
    (value) => value === undefined || Number.isSafeInteger(value),
    "Le prix est trop élevé.",
  );

export const catalogCategorySchema = z.object({
  categoryId: optionalId,
  description: optionalText(500, "La description est trop longue."),
  name: requiredText(120, "Le nom de la catégorie est trop long."),
});

export const catalogItemSchema = z.object({
  categoryId: optionalId,
  description: optionalText(1_000, "La description est trop longue."),
  itemId: optionalId,
  name: requiredText(200, "Le nom de la prestation est trop long."),
  unit: requiredText(80, "L’unité est trop longue."),
  unitPriceHtCents: priceCentsSchema,
});

export type CatalogCategoryFormState = {
  fieldErrors?: Partial<Record<"description" | "name", string>>;
  message?: string;
  status: "error" | "idle";
};

export type CatalogItemFormState = {
  fieldErrors?: Partial<
    Record<"categoryId" | "description" | "name" | "unit" | "unitPriceHtCents", string>
  >;
  message?: string;
  status: "error" | "idle";
};

export type CatalogDeleteFormState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialCatalogCategoryFormState: CatalogCategoryFormState = {
  status: "idle",
};

export const initialCatalogItemFormState: CatalogItemFormState = {
  status: "idle",
};

export const initialCatalogDeleteFormState: CatalogDeleteFormState = {
  status: "idle",
};

export function getCatalogCategoryValues(formData: FormData) {
  return {
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    name: formData.get("name"),
  };
}

export function getCatalogItemValues(formData: FormData) {
  return {
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    itemId: formData.get("itemId"),
    name: formData.get("name"),
    unit: formData.get("unit"),
    unitPriceHtCents: formData.get("unitPriceHt"),
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

export function getCatalogCategoryFieldErrors(error: z.ZodError) {
  return getFieldErrors(error, ["description", "name"] as const);
}

export function getCatalogItemFieldErrors(error: z.ZodError) {
  return getFieldErrors(
    error,
    ["categoryId", "description", "name", "unit", "unitPriceHtCents"] as const,
  );
}

export function formatUnitPrice(cents: number | null) {
  if (cents === null) {
    return "";
  }

  return (cents / 100).toFixed(2).replace(".", ",");
}

export const catalogCategoryIdSchema = z.string().uuid();
export const catalogItemIdSchema = z.string().uuid();
