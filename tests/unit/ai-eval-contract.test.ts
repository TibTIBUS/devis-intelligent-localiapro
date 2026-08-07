import { describe, expect, it } from "vitest";

import { gradeQuoteAssistantEval, quoteAssistantEvalScenarios } from "@/lib/ai/evals/quote-assistant-evals";

describe("quote assistant evaluation contract", () => {
  it("covers the architecture scenarios", () => {
    expect(quoteAssistantEvalScenarios.map((scenario) => scenario.id)).toEqual([
      "catalog-search-before-add",
      "missing-price-no-add",
      "ambiguous-catalog-choice",
      "explicit-discount-tool",
      "amount-is-not-a-discount-rate",
    ]);
  });

  it("grades tool actions instead of assistant prose", () => {
    expect(gradeQuoteAssistantEval("catalog-search-before-add", [
      { arguments: { query: "main-d’œuvre" }, name: "search_catalog" },
      { arguments: { catalogItemId: "id", lineKind: "labor", quantity: "4" }, name: "add_quote_line" },
    ])).toEqual([]);
    expect(gradeQuoteAssistantEval("catalog-search-before-add", [
      { arguments: { catalogItemId: "id" }, name: "add_quote_line" },
    ])).toContain("Le catalogue doit être consulté avant toute mutation.");
  });

  it("rejects invented prices, ambiguous additions and inferred financial rates", () => {
    expect(gradeQuoteAssistantEval("missing-price-no-add", [
      { arguments: { query: "douche" }, name: "search_catalog" },
      { arguments: { catalogItemId: "id" }, name: "add_quote_line" },
    ])).toContain("Une ligne sans prix catalogue ne doit pas être proposée.");
    expect(gradeQuoteAssistantEval("ambiguous-catalog-choice", [
      { arguments: { query: "WC" }, name: "search_catalog" },
    ])).toEqual([]);
    expect(gradeQuoteAssistantEval("amount-is-not-a-discount-rate", [
      { arguments: { discountRate: "100" }, name: "set_discount" },
    ])).toContain("Un montant en euros ne doit jamais être converti en taux de remise.");
  });

  it("requires the exact discount tool arguments", () => {
    expect(gradeQuoteAssistantEval("explicit-discount-tool", [
      { arguments: { discountRate: "10" }, name: "set_discount" },
    ])).toEqual([]);
    expect(gradeQuoteAssistantEval("explicit-discount-tool", [
      { arguments: { discountRate: "15" }, name: "set_discount" },
    ])).toContain("Le taux transmis doit être exactement 10 %.");
  });
});
