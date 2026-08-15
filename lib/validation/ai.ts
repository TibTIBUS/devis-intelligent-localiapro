import { z } from "zod";

export const aiConversationMessageSchema = z.object({
  content: z.string().trim().min(1).max(1_000),
  role: z.enum(["user", "assistant"]),
}).strict();

export const quoteAssistantRequestSchema = z
  .object({
    messages: z.array(aiConversationMessageSchema).min(1).max(10),
    quoteId: z.uuid(),
  }).strict()
  .refine((value) => value.messages.at(-1)?.role === "user", {
    message: "Le dernier message doit provenir de l’utilisateur.",
    path: ["messages"],
  });

export const searchCatalogArgumentsSchema = z.object({
  query: z.string().trim().min(2).max(100),
}).strict();

export const voiceSpeakRequestSchema = z.object({
  text: z.string().trim().min(1).max(2_000),
}).strict();

export const aiQuoteLineKindSchema = z.enum([
  "labor",
  "material",
  "travel",
  "service",
  "other",
]);

const aiQuantitySchema = z
  .string()
  .trim()
  .regex(/^\d+(?:[.,]\d{1,3})?$/)
  .transform((value) => value.replace(",", "."))
  .transform((value) => Math.round(Number(value) * 1_000))
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER));

const aiVatRateSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(value), "Le taux de TVA doit être explicite.")
  .transform((value) => Math.round(Number(value) * 100))
  .pipe(z.number().int().min(0).max(10_000));

const aiQuantityInputSchema = z.string().trim().min(1).max(40).refine((value) => /^\d+(?:[.,]\d{1,3})?$/.test(value));

export const addQuoteLineArgumentsSchema = z.object({
  catalogItemId: z.uuid(),
  lineKind: aiQuoteLineKindSchema,
  quantity: aiQuantityInputSchema,
  vatRate: z.union([aiVatRateSchema, z.null()]),
}).strict();

export const updateQuoteLineArgumentsSchema = z.object({
  lineKind: aiQuoteLineKindSchema.nullable(),
  quantity: z.union([aiQuantityInputSchema, z.null()]),
  quoteLineId: z.uuid(),
  vatRate: z.union([aiVatRateSchema, z.null()]),
}).strict();

export const deleteQuoteLineArgumentsSchema = z.object({
  quoteLineId: z.uuid(),
}).strict();

export const setPaymentTermsArgumentsSchema = z.object({
  paymentTerms: z.string().trim().min(1).max(2_000),
}).strict();

export const setValidityArgumentsSchema = z.object({
  validUntil: z.string().date(),
}).strict();

export const setWorksiteAddressArgumentsSchema = z.object({
  workAddressId: z.uuid(),
}).strict();

export const updateQuoteNoteArgumentsSchema = z.object({
  note: z.string().trim().min(1).max(4_000),
}).strict();

const aiPercentageSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(value), "Le pourcentage doit être explicite et comporter deux décimales maximum.")
  .transform((value) => Math.round(Number(value) * 100))
  .pipe(z.number().int().min(0).max(10_000));

export const setDiscountArgumentsSchema = z.object({ discountRate: aiPercentageSchema }).strict();
export const setDepositArgumentsSchema = z.object({ depositRate: aiPercentageSchema }).strict();

export const aiQuoteLineProposalSchema = z.object({
  actionType: z.literal("add_quote_line"),
  catalogItemId: z.uuid(),
  label: z.string().trim().min(1).max(200),
  lineKind: aiQuoteLineKindSchema,
  quantityMilliunits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  unit: z.string().trim().min(1).max(80),
  unitPriceHtCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  vatRateBasisPoints: z.number().int().min(0).max(10_000),
}).strict();

export const aiUpdateQuoteLineProposalSchema = z.object({
  actionType: z.literal("update_quote_line"),
  currentLineKind: aiQuoteLineKindSchema,
  currentQuantityMilliunits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currentVatRateBasisPoints: z.number().int().min(0).max(10_000).nullable(),
  label: z.string().trim().min(1).max(200),
  lineKind: aiQuoteLineKindSchema,
  quantityMilliunits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  quoteLineId: z.uuid(),
  unit: z.string().trim().min(1).max(80),
  vatRateBasisPoints: z.number().int().min(0).max(10_000),
}).strict();

export const aiDeleteQuoteLineProposalSchema = z.object({
  actionType: z.literal("delete_quote_line"),
  label: z.string().trim().min(1).max(200),
  lineKind: aiQuoteLineKindSchema,
  quantityMilliunits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  quoteLineId: z.uuid(),
  unit: z.string().trim().min(1).max(80),
}).strict();

export const aiSetPaymentTermsProposalSchema = z.object({
  actionType: z.literal("set_payment_terms"),
  paymentTerms: z.string().trim().min(1).max(2_000),
}).strict();

export const aiSetValidityProposalSchema = z.object({
  actionType: z.literal("set_validity"),
  validUntil: z.string().date(),
}).strict();

export const aiSetWorksiteAddressProposalSchema = z.object({
  actionType: z.literal("set_worksite_address"),
  addressLabel: z.string().trim().min(1).max(500),
  workAddressId: z.uuid(),
}).strict();

export const aiUpdateQuoteNoteProposalSchema = z.object({
  actionType: z.literal("update_quote_note"),
  note: z.string().trim().min(1).max(4_000),
}).strict();

export const aiSetDiscountProposalSchema = z.object({
  actionType: z.literal("set_discount"),
  currentRateBasisPoints: z.number().int().min(0).max(10_000),
  rateBasisPoints: z.number().int().min(0).max(10_000),
}).strict();

export const aiSetDepositProposalSchema = z.object({
  actionType: z.literal("set_deposit"),
  currentRateBasisPoints: z.number().int().min(0).max(10_000),
  rateBasisPoints: z.number().int().min(0).max(10_000),
}).strict();

export const aiFinalizeQuoteProposalSchema = z.object({
  actionType: z.literal("finalize_quote"),
}).strict();

export const aiSendQuoteEmailProposalSchema = z.object({
  actionType: z.literal("send_quote_email"),
  contactId: z.uuid(),
  contactLabel: z.string().trim().min(1).max(300),
}).strict();

export const aiQuoteActionProposalSchema = z.discriminatedUnion("actionType", [
  aiQuoteLineProposalSchema,
  aiUpdateQuoteLineProposalSchema,
  aiDeleteQuoteLineProposalSchema,
  aiSetPaymentTermsProposalSchema,
  aiSetValidityProposalSchema,
  aiSetWorksiteAddressProposalSchema,
  aiUpdateQuoteNoteProposalSchema,
  aiSetDiscountProposalSchema,
  aiSetDepositProposalSchema,
  aiFinalizeQuoteProposalSchema,
  aiSendQuoteEmailProposalSchema,
]);

export const undoAiQuoteActionSchema = z.object({ quoteId: z.uuid() }).strict();

export function parseAiQuantityToMilliunits(quantity: string) {
  return aiQuantitySchema.parse(quantity);
}

export type AiConversationMessage = z.infer<typeof aiConversationMessageSchema>;
export type QuoteAssistantRequest = z.infer<typeof quoteAssistantRequestSchema>;
export type SearchCatalogArguments = z.infer<typeof searchCatalogArgumentsSchema>;
export type AiQuoteLineProposal = z.infer<typeof aiQuoteLineProposalSchema>;
export type AiQuoteActionProposal = z.infer<typeof aiQuoteActionProposalSchema>;
export type AiUpdateQuoteLineProposal = z.infer<typeof aiUpdateQuoteLineProposalSchema>;
export type AiDeleteQuoteLineProposal = z.infer<typeof aiDeleteQuoteLineProposalSchema>;
