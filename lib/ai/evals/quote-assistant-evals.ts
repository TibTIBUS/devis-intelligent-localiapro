import { setDiscountArgumentsSchema } from "@/lib/validation/ai";

export type QuoteAssistantEvalCall = { arguments: unknown; name: string };

export type QuoteAssistantEvalScenario = {
  catalogItems: Array<{ id: string; name: string; unit: string; unitPriceHtCents: number | null }>;
  id: string;
  userMessage: string;
};

export const quoteAssistantEvalScenarios: QuoteAssistantEvalScenario[] = [
  {
    catalogItems: [{ id: "13000000-0000-4000-8000-000000000001", name: "Main-d’œuvre plomberie", unit: "heure", unitPriceHtCents: 5_500 }],
    id: "catalog-search-before-add",
    userMessage: "Ajoute 4 heures de main-d’œuvre.",
  },
  {
    catalogItems: [{ id: "13000000-0000-4000-8000-000000000002", name: "Pose d’une douche", unit: "forfait", unitPriceHtCents: null }],
    id: "missing-price-no-add",
    userMessage: "Pose une douche.",
  },
  {
    catalogItems: [
      { id: "13000000-0000-4000-8000-000000000003", name: "WC au sol", unit: "unité", unitPriceHtCents: 32_000 },
      { id: "13000000-0000-4000-8000-000000000004", name: "WC suspendu", unit: "unité", unitPriceHtCents: 58_000 },
    ],
    id: "ambiguous-catalog-choice",
    userMessage: "Ajoute un WC.",
  },
  {
    catalogItems: [],
    id: "explicit-discount-tool",
    userMessage: "Mets 10 % de remise.",
  },
  {
    catalogItems: [],
    id: "amount-is-not-a-discount-rate",
    userMessage: "Fais une remise de 100 euros.",
  },
];

export function gradeQuoteAssistantEval(scenarioId: string, calls: QuoteAssistantEvalCall[]) {
  const issues: string[] = [];
  const names = calls.map((call) => call.name);
  const firstMutationIndex = calls.findIndex((call) => call.name !== "search_catalog");
  const searchIndex = names.indexOf("search_catalog");

  if (scenarioId === "catalog-search-before-add") {
    if (searchIndex === -1) issues.push("search_catalog doit être appelé.");
    if (firstMutationIndex !== -1 && (searchIndex === -1 || searchIndex > firstMutationIndex)) issues.push("Le catalogue doit être consulté avant toute mutation.");
  } else if (scenarioId === "missing-price-no-add") {
    if (searchIndex === -1) issues.push("Le catalogue doit être consulté.");
    if (names.includes("add_quote_line")) issues.push("Une ligne sans prix catalogue ne doit pas être proposée.");
  } else if (scenarioId === "ambiguous-catalog-choice") {
    if (searchIndex === -1) issues.push("Le catalogue doit être consulté.");
    if (names.includes("add_quote_line")) issues.push("Un résultat ambigu doit être clarifié avant ajout.");
  } else if (scenarioId === "explicit-discount-tool") {
    const discountCalls = calls.filter((call) => call.name === "set_discount");
    if (discountCalls.length !== 1) issues.push("set_discount doit être appelé exactement une fois.");
    else {
      const parsed = setDiscountArgumentsSchema.safeParse(discountCalls[0].arguments);
      if (!parsed.success || parsed.data.discountRate !== 1_000) issues.push("Le taux transmis doit être exactement 10 %.");
    }
  } else if (scenarioId === "amount-is-not-a-discount-rate" && names.includes("set_discount")) {
    issues.push("Un montant en euros ne doit jamais être converti en taux de remise.");
  } else if (!quoteAssistantEvalScenarios.some((scenario) => scenario.id === scenarioId)) {
    issues.push("Scénario d’évaluation inconnu.");
  }

  return issues;
}
