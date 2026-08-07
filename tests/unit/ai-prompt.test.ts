import { describe, expect, it } from "vitest";

import { buildQuoteAssistantPrompt } from "@/lib/ai/prompts/quote-assistant";

describe("quote assistant prompt", () => {
  it("contains the immutable AI safety rules and only the active quote context", () => {
    const prompt = buildQuoteAssistantPrompt({
      lines: [{
        id: "4a02d6aa-6882-4e56-9f27-d74a83f90ca8",
        label: "Main-d’œuvre plomberie",
        lineKind: "labor",
        quantityMilliunits: 2_000,
        unit: "heure",
      }],
      quoteId: "2f3023a6-3bb4-4d3c-a0ab-fc297a62fb23",
      status: "draft",
      note: null,
      paymentTerms: null,
      validUntil: null,
      workAddressId: null,
      workAddresses: [{ id: "8ba9c847-da8c-4dfa-b01a-1d88da690b9d", label: "Chantier — 2 rue du Test, 75001 Paris" }],
    });

    expect(prompt).toContain("N’invente jamais un prix");
    expect(prompt).toContain("Ne calcule jamais les totaux");
    expect(prompt).toContain("aucun accès direct à la base de données");
    expect(prompt).toContain("add_quote_line, update_quote_line et delete_quote_line préparent seulement une proposition");
    expect(prompt).toContain("N’invente jamais le taux de TVA");
    expect(prompt).toContain("Main-d’œuvre plomberie");
    expect(prompt).toContain("JSON non exécutable");
    expect(prompt).toContain("N’invente, ne complète et ne reformule aucune clause juridique");
    expect(prompt).toContain("Chantier — 2 rue du Test");
  });
});
