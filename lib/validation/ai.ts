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

export const addQuoteLineArgumentsSchema = z.object({
  catalogItemId: z.uuid(),
  lineKind: aiQuoteLineKindSchema,
  quantity: z.string().trim().min(1).max(40).refine((value) => /^\d+(?:[.,]\d{1,3})?$/.test(value)),
}).strict();

export const aiQuoteLineProposalSchema = z.object({
  catalogItemId: z.uuid(),
  label: z.string().trim().min(1).max(200),
  lineKind: aiQuoteLineKindSchema,
  quantityMilliunits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  unit: z.string().trim().min(1).max(80),
  unitPriceHtCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).strict();

export const confirmAiQuoteLineSchema = z.object({
  proposal: aiQuoteLineProposalSchema.pick({
    catalogItemId: true,
    lineKind: true,
    quantityMilliunits: true,
  }),
  quoteId: z.uuid(),
  vatRate: z
    .string()
    .trim()
    .transform((value) => value.replace(",", "."))
    .refine((value) => /^\d+(?:\.\d{1,2})?$/.test(value))
    .transform((value) => Math.round(Number(value) * 100))
    .pipe(z.number().int().min(0).max(10_000)),
}).strict();

export const undoAiQuoteActionSchema = z.object({ quoteId: z.uuid() }).strict();

export function parseAiQuantityToMilliunits(quantity: string) {
  return aiQuantitySchema.parse(quantity);
}

export type AiConversationMessage = z.infer<typeof aiConversationMessageSchema>;
export type QuoteAssistantRequest = z.infer<typeof quoteAssistantRequestSchema>;
export type SearchCatalogArguments = z.infer<typeof searchCatalogArgumentsSchema>;
export type AiQuoteLineProposal = z.infer<typeof aiQuoteLineProposalSchema>;
