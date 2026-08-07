import { z } from "zod";

const optionalId = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .pipe(z.string().uuid().optional());

const requiredText = (maxLength: number, message: string) =>
  z.string().trim().min(1, "Ce champ est obligatoire.").max(maxLength, message);

const optionalText = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => value ?? "",
    z.string().trim().max(maxLength, message).transform((value) => value || undefined),
  );

const decimalInteger = (scale: number, label: string) =>
  z
    .string()
    .trim()
    .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
    .refine(
      (value) => /^\d+(?:\.\d{1,3})?$/.test(value),
      `Saisissez ${label} valide.`,
    )
    .transform((value) => Math.round(Number(value) * scale))
    .refine(Number.isSafeInteger, `${label} est trop Ã©levÃ©.`);

const optionalPriceCents = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
  .refine(
    (value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value),
    "Saisissez un prix valide, avec deux dÃ©cimales maximum.",
  )
  .transform((value) => (value === "" ? undefined : Math.round(Number(value) * 100)))
  .refine((value) => value === undefined || Number.isSafeInteger(value), "Le prix est trop Ã©levÃ©.");

const optionalVatRateBasisPoints = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
  .refine(
    (value) => value === "" || /^\d+(?:\.\d{1,2})?$/.test(value),
    "Saisissez un taux de TVA valide, avec deux dÃ©cimales maximum.",
  )
  .transform((value) => (value === "" ? undefined : Math.round(Number(value) * 100)))
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0 && value <= 10_000),
    "Le taux de TVA doit Ãªtre compris entre 0 et 100 %.",
  );

const percentageBasisPoints = (label: string) =>
  z
    .string()
    .trim()
    .transform((value) => value.replaceAll(/\s/g, "").replace(",", "."))
    .refine(
      (value) => /^\d+(?:\.\d{1,2})?$/.test(value),
      `Saisissez ${label} valide, avec deux dÃ©cimales maximum.`,
    )
    .transform((value) => Math.round(Number(value) * 100))
    .refine(
      (value) => Number.isInteger(value) && value >= 0 && value <= 10_000,
      `${label} doit Ãªtre compris entre 0 et 100 %.`,
    );

export const quoteCreateSchema = z.object({
  customerId: z.string().uuid("SÃ©lectionnez un client."),
});

export const quoteFinancialSettingsSchema = z.object({
  depositRateBasisPoints: percentageBasisPoints("Le taux dâ€™acompte"),
  discountRateBasisPoints: percentageBasisPoints("Le taux de remise"),
  isQuoteFree: z.enum(["free", "paid"], { message: "Indiquez si le devis est gratuit ou payant." }).transform((value) => value === "free"),
  preparationFeeHtCents: optionalPriceCents,
  preparationFeeVatRateBasisPoints: optionalVatRateBasisPoints,
  paymentTerms: optionalText(2_000, "Les conditions de paiement sont trop longues."),
  quoteId: z.string().uuid(),
  note: optionalText(4_000, "La note est trop longue."),
  travelFeeApplicable: z.enum(["yes", "no"], { message: "Indiquez si des frais de déplacement s’appliquent." }).transform((value) => value === "yes"),
  validUntil: z.string().date("Saisissez une date de validitÃ© valide."),
  workAddressId: z.string().uuid("SÃ©lectionnez le lieu dâ€™exÃ©cution."),
}).superRefine((value, context) => {
  if (!value.isQuoteFree) {
    if (!value.preparationFeeHtCents) {
      context.addIssue({ code: "custom", message: "Indiquez un prix HT supérieur à zéro.", path: ["preparationFeeHtCents"] });
    }
    if (value.preparationFeeVatRateBasisPoints === undefined) {
      context.addIssue({ code: "custom", message: "Indiquez le taux de TVA applicable.", path: ["preparationFeeVatRateBasisPoints"] });
    }
  }
});

export const quoteSectionSchema = z.object({
  quoteId: z.string().uuid(),
  sectionId: optionalId,
  title: requiredText(200, "Le titre de section est trop long."),
});

export const quoteLineSchema = z.object({
  catalogItemId: optionalId,
  description: optionalText(1_000, "La description est trop longue."),
  label: optionalText(200, "Le libellÃ© est trop long."),
  lineId: optionalId,
  lineKind: z.enum(["labor", "material", "travel", "service", "other"], { message: "Sélectionnez la nature de la ligne." }),
  quantityMilliunits: decimalInteger(1_000, "une quantitÃ©").refine(
    (value) => value > 0,
    "La quantitÃ© doit Ãªtre supÃ©rieure Ã  zÃ©ro.",
  ),
  quoteId: z.string().uuid(),
  sectionId: optionalId,
  unit: optionalText(80, "Lâ€™unitÃ© est trop longue."),
  unitPriceHtCents: optionalPriceCents,
  vatRateBasisPoints: optionalVatRateBasisPoints,
}).superRefine((value, context) => {
  if (!value.catalogItemId || value.lineId) {
    if (!value.label) {
      context.addIssue({ code: "custom", message: "Ce champ est obligatoire.", path: ["label"] });
    }
    if (!value.unit) {
      context.addIssue({ code: "custom", message: "Ce champ est obligatoire.", path: ["unit"] });
    }
  }
});

export const quoteIdSchema = z.string().uuid();
export const quoteLineIdSchema = z.string().uuid();
export const quoteSectionIdSchema = z.string().uuid();
export const quoteSearchSchema = z.string().trim().max(100, "La recherche est trop longue.");

export type QuoteFormState = {
  fieldErrors?: Partial<Record<string, string>>;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialQuoteFormState: QuoteFormState = { status: "idle" };

export function getQuoteCreateValues(formData: FormData) {
  return { customerId: formData.get("customerId") };
}

export function getQuoteFinancialSettingsValues(formData: FormData) {
  return {
    depositRateBasisPoints: formData.get("depositRate"),
    discountRateBasisPoints: formData.get("discountRate"),
    isQuoteFree: formData.get("isQuoteFree"),
    preparationFeeHtCents: formData.get("preparationFeeHt"),
    preparationFeeVatRateBasisPoints: formData.get("preparationFeeVatRate"),
    paymentTerms: formData.get("paymentTerms"),
    quoteId: formData.get("quoteId"),
    note: formData.get("note"),
    travelFeeApplicable: formData.get("travelFeeApplicable"),
    validUntil: formData.get("validUntil"),
    workAddressId: formData.get("workAddressId"),
  };
}

export function getQuoteSectionValues(formData: FormData) {
  return {
    quoteId: formData.get("quoteId"),
    sectionId: formData.get("sectionId"),
    title: formData.get("title"),
  };
}

export function getQuoteLineValues(formData: FormData) {
  return {
    catalogItemId: formData.get("catalogItemId"),
    description: formData.get("description"),
    label: formData.get("label"),
    lineId: formData.get("lineId"),
    lineKind: formData.get("lineKind"),
    quantityMilliunits: formData.get("quantity"),
    quoteId: formData.get("quoteId"),
    sectionId: formData.get("sectionId"),
    unit: formData.get("unit"),
    unitPriceHtCents: formData.get("unitPriceHt"),
    vatRateBasisPoints: formData.get("vatRate"),
  };
}

export function getQuoteFieldErrors(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.flatMap((issue) => {
      const field = issue.path[0];
      return typeof field === "string" ? [[field, issue.message]] : [];
    }),
  ) as Partial<Record<string, string>>;
}

export function formatAmountInput(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function formatQuantityInput(milliunits: number) {
  return (milliunits / 1_000).toFixed(3).replace(/(?:\.0+|(?:(\.\d*?[1-9]))0+)$/, "$1").replace(".", ",");
}

export function formatRateInput(basisPoints: number | null) {
  return basisPoints === null ? "" : (basisPoints / 100).toFixed(2).replace(".", ",");
}
