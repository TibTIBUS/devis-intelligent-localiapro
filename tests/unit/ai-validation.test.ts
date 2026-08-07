import { describe, expect, it } from "vitest";

import {
  addQuoteLineArgumentsSchema,
  confirmAiQuoteLineSchema,
  parseAiQuantityToMilliunits,
  quoteAssistantRequestSchema,
  searchCatalogArgumentsSchema,
} from "@/lib/validation/ai";

const quoteId = "2f3023a6-3bb4-4d3c-a0ab-fc297a62fb23";

describe("quote assistant validation", () => {
  it("accepts a bounded conversation ending with the artisan message", () => {
    expect(quoteAssistantRequestSchema.parse({
      messages: [
        { content: "Bonjour", role: "user" },
        { content: "Que souhaitez-vous préparer ?", role: "assistant" },
        { content: "Cherche une prestation de plomberie", role: "user" },
      ],
      quoteId,
    }).messages).toHaveLength(3);
  });

  it("rejects a conversation not ending with a user message", () => {
    expect(quoteAssistantRequestSchema.safeParse({
      messages: [{ content: "Réponse", role: "assistant" }],
      quoteId,
    }).success).toBe(false);
  });

  it("rejects oversized messages and unknown tool arguments", () => {
    expect(quoteAssistantRequestSchema.safeParse({
      messages: [{ content: "a".repeat(1_001), role: "user" }],
      quoteId,
    }).success).toBe(false);
    expect(searchCatalogArgumentsSchema.safeParse({
      organizationId: quoteId,
      query: "plomberie",
    }).success).toBe(false);
  });

  it("converts quantities and VAT deterministically on the server", () => {
    expect(parseAiQuantityToMilliunits("4,250")).toBe(4_250);
    expect(addQuoteLineArgumentsSchema.safeParse({
      catalogItemId: quoteId,
      lineKind: "labor",
      quantity: "quatre",
    }).success).toBe(false);
    expect(confirmAiQuoteLineSchema.parse({
      proposal: {
        catalogItemId: quoteId,
        lineKind: "labor",
        quantityMilliunits: 4_000,
      },
      quoteId,
      vatRate: "10,00",
    }).vatRate).toBe(1_000);
  });
});
