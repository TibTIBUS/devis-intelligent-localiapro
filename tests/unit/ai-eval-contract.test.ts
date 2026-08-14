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
      "multi-action-targeted-vat-and-deposit",
    ]);
  });

  it("grades tool actions instead of assistant prose", () => {
    expect(gradeQuoteAssistantEval("catalog-search-before-add", [
      { arguments: { query: "main-d’œuvre" }, name: "search_catalog" },
      { arguments: { catalogItemId: "id", lineKind: "labor", quantity: "4", vatRate: null }, name: "add_quote_line" },
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

  it("requires three direct additions, targeted VAT and the exact deposit", () => {
    const calls = [
      { arguments: { query: "prises interrupteurs tableau électrique" }, name: "search_catalog" },
      { arguments: { catalogItemId: "13000000-0000-4000-8000-000000000005", lineKind: "service", quantity: "8", vatRate: "10" }, name: "add_quote_line" },
      { arguments: { catalogItemId: "13000000-0000-4000-8000-000000000006", lineKind: "service", quantity: "3", vatRate: null }, name: "add_quote_line" },
      { arguments: { catalogItemId: "13000000-0000-4000-8000-000000000007", lineKind: "service", quantity: "1", vatRate: null }, name: "add_quote_line" },
      { arguments: { depositRate: "30" }, name: "set_deposit" },
    ];

    expect(gradeQuoteAssistantEval("multi-action-targeted-vat-and-deposit", calls)).toEqual([]);
    expect(gradeQuoteAssistantEval("multi-action-targeted-vat-and-deposit", calls.map((call) =>
      call.name === "set_deposit" ? { ...call, arguments: { depositRate: "20" } } : call,
    ))).toContain("L’acompte transmis doit être exactement 30 %.");
    expect(gradeQuoteAssistantEval("multi-action-targeted-vat-and-deposit", calls.map((call) =>
      call.name === "add_quote_line" && (call.arguments as { catalogItemId?: string }).catalogItemId === "13000000-0000-4000-8000-000000000006"
        ? { ...call, arguments: { ...(call.arguments as object), vatRate: "10" } }
        : call,
    ))).toContain("La TVA de 13000000-0000-4000-8000-000000000006 est incorrecte.");
  });
});
