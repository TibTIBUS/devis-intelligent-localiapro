import { describe, expect, it } from "vitest";

import { buildQuoteAssistantPrompt } from "@/lib/ai/prompts/quote-assistant";

describe("quote assistant prompt", () => {
  it("contains the immutable AI safety rules and only the active quote context", () => {
    const prompt = buildQuoteAssistantPrompt({
      businessTrade: "Plomberie",
      lines: [{
        id: "4a02d6aa-6882-4e56-9f27-d74a83f90ca8",
        label: "Main-d’œuvre plomberie",
        lineKind: "labor",
        quantityMilliunits: 2_000,
        unit: "heure",
        vatRateBasisPoints: 2_000,
      }],
      quoteId: "2f3023a6-3bb4-4d3c-a0ab-fc297a62fb23",
      status: "draft",
      depositRateBasisPoints: 3_000,
      discountRateBasisPoints: 500,
      note: null,
      paymentTerms: null,
      validUntil: null,
      workAddressId: null,
      workAddresses: [{ id: "8ba9c847-da8c-4dfa-b01a-1d88da690b9d", label: "Chantier — 2 rue du Test, 75001 Paris" }],
      contacts: [{ id: "9c0f4b9a-2b28-4a4a-9e0a-9a6f5b0b6a0e", label: "Mme Dupont — client@example.com" }],
    });

    expect(prompt).toContain("N’invente jamais un prix");
    expect(prompt).toContain("Ne calcule jamais les totaux");
    expect(prompt).toContain("aucun accès direct à la base de données");
    expect(prompt).toContain("ne demande plus de confirmation séparée");
    expect(prompt).toContain("Le taux de TVA métier par défaut d’une nouvelle ligne est 20 %");
    expect(prompt).toContain("envoie vatRate=null et le serveur appliquera 20 %");
    expect(prompt).toContain("retire/supprime N unités");
    expect(prompt).toContain("utilise update_quote_line avec la quantité restante, jamais delete_quote_line");
    expect(prompt).toContain("Si une diminution amène exactement la quantité à zéro, utilise delete_quote_line");
    expect(prompt).toContain("Main-d’œuvre plomberie");
    expect(prompt).toContain("JSON non exécutable");
    expect(prompt).toContain("N’invente, ne complète et ne reformule aucune clause juridique");
    expect(prompt).toContain("Chantier — 2 rue du Test");
    expect(prompt).toContain("Ne déduis jamais un taux depuis un montant");
    expect(prompt).toContain("Plomberie");
  });
});
