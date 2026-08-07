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

export type AiConversationMessage = z.infer<typeof aiConversationMessageSchema>;
export type QuoteAssistantRequest = z.infer<typeof quoteAssistantRequestSchema>;
export type SearchCatalogArguments = z.infer<typeof searchCatalogArgumentsSchema>;
