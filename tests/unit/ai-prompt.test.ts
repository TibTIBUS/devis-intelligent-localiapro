import { describe, expect, it } from "vitest";

import { buildQuoteAssistantPrompt } from "@/lib/ai/prompts/quote-assistant";

describe("quote assistant prompt", () => {
  it("contains the immutable AI safety rules and only the active quote context", () => {
    const prompt = buildQuoteAssistantPrompt({
      lineLabels: ["Main-d’œuvre plomberie"],
      quoteId: "2f3023a6-3bb4-4d3c-a0ab-fc297a62fb23",
      status: "draft",
    });

    expect(prompt).toContain("N’invente jamais un prix");
    expect(prompt).toContain("Ne calcule jamais les totaux");
    expect(prompt).toContain("aucun accès direct à la base de données");
    expect(prompt).toContain("lecture seule");
    expect(prompt).toContain("Main-d’œuvre plomberie");
    expect(prompt).toContain("JSON non exécutable");
  });
});
