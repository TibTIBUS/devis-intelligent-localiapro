import { describe, expect, it } from "vitest";

import {
  addQuoteLineArgumentsSchema,
  deleteQuoteLineArgumentsSchema,
  parseAiQuantityToMilliunits,
  quoteAssistantRequestSchema,
  searchCatalogArgumentsSchema,
  updateQuoteLineArgumentsSchema,
  setPaymentTermsArgumentsSchema,
  setValidityArgumentsSchema,
  setWorksiteAddressArgumentsSchema,
  updateQuoteNoteArgumentsSchema,
  setDepositArgumentsSchema,
  setDiscountArgumentsSchema,
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
      vatRate: null,
    }).success).toBe(false);
    expect(addQuoteLineArgumentsSchema.parse({
      catalogItemId: quoteId,
      lineKind: "labor",
      quantity: "4",
      vatRate: "10,00",
    }).vatRate).toBe(1_000);
  });

  it("validates controlled update and deletion payloads", () => {
    expect(updateQuoteLineArgumentsSchema.parse({
      lineKind: "service",
      quantity: "2,5",
      quoteLineId: quoteId,
      vatRate: null,
    }).quoteLineId).toBe(quoteId);
    expect(updateQuoteLineArgumentsSchema.parse({
      lineKind: null,
      quantity: null,
      quoteLineId: quoteId,
      vatRate: "10",
    }).vatRate).toBe(1_000);
    expect(deleteQuoteLineArgumentsSchema.safeParse({ quoteLineId: quoteId }).success).toBe(true);
  });

  it("validates exact non-financial quote settings", () => {
    expect(setPaymentTermsArgumentsSchema.parse({ paymentTerms: "Paiement à réception" }).paymentTerms).toBe("Paiement à réception");
    expect(setValidityArgumentsSchema.safeParse({ validUntil: "2026-09-30" }).success).toBe(true);
    expect(setValidityArgumentsSchema.safeParse({ validUntil: "dans 30 jours" }).success).toBe(false);
    expect(setWorksiteAddressArgumentsSchema.safeParse({ workAddressId: quoteId, organizationId: quoteId }).success).toBe(false);
    expect(updateQuoteNoteArgumentsSchema.safeParse({ note: "a".repeat(4_001) }).success).toBe(false);
  });

  it("converts only explicit financial percentages to basis points", () => {
    expect(setDiscountArgumentsSchema.parse({ discountRate: "10,25" }).discountRate).toBe(1_025);
    expect(setDepositArgumentsSchema.parse({ depositRate: "30" }).depositRate).toBe(3_000);
    expect(setDiscountArgumentsSchema.safeParse({ discountRate: "10 %" }).success).toBe(false);
    expect(setDepositArgumentsSchema.safeParse({ depositRate: "un tiers" }).success).toBe(false);
    expect(setDiscountArgumentsSchema.safeParse({ discountRate: "100.01" }).success).toBe(false);
  });
});
