import {
  addQuoteLineArgumentsSchema,
  setDepositArgumentsSchema,
  setDiscountArgumentsSchema,
} from "@/lib/validation/ai";

export type QuoteAssistantEvalCall = { arguments: unknown; name: string };

export type QuoteAssistantEvalScenario = {
  catalogItems: Array<{ id: string; name: string; unit: string; unitPriceHtCents: number | null }>;
  id: string;
  userMessage: string;
};

const multiActionCatalogIds = {
  outlet: "13000000-0000-4000-8000-000000000005",
  switch: "13000000-0000-4000-8000-000000000006",
  panel: "13000000-0000-4000-8000-000000000007",
} as const;

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
  {
    catalogItems: [
      { id: multiActionCatalogIds.outlet, name: "Prise de courant", unit: "unité", unitPriceHtCents: 8_500 },
      { id: multiActionCatalogIds.switch, name: "Interrupteur simple", unit: "unité", unitPriceHtCents: 7_000 },
      { id: multiActionCatalogIds.panel, name: "Tableau électrique 3 rangées", unit: "unité", unitPriceHtCents: 42_000 },
    ],
    id: "multi-action-targeted-vat-and-deposit",
    userMessage: "Ajoute 8 prises de courant, 3 interrupteurs simples et 1 tableau électrique 3 rangées. Mets uniquement les prises à 10 % de TVA et mets 30 % d’acompte.",
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
  } else if (scenarioId === "amount-is-not-a-discount-rate") {
    if (names.includes("set_discount")) issues.push("Un montant en euros ne doit jamais être converti en taux de remise.");
  } else if (scenarioId === "multi-action-targeted-vat-and-deposit") {
    if (searchIndex === -1) issues.push("Le catalogue doit être consulté avant les ajouts multi-actions.");

    const addCalls = calls.filter((call) => call.name === "add_quote_line");
    if (addCalls.length !== 3) {
      issues.push("Les trois prestations doivent être ajoutées exactement une fois chacune.");
    } else {
      const expected = new Map([
        [multiActionCatalogIds.outlet, { quantity: "8", vatRateBasisPoints: 1_000 }],
        [multiActionCatalogIds.switch, { quantity: "3", vatRateBasisPoints: null }],
        [multiActionCatalogIds.panel, { quantity: "1", vatRateBasisPoints: null }],
      ]);

      for (const call of addCalls) {
        const parsed = addQuoteLineArgumentsSchema.safeParse(call.arguments);
        if (!parsed.success) {
          issues.push("Chaque ajout doit respecter le contrat strict add_quote_line.");
          continue;
        }
        const expectation = expected.get(parsed.data.catalogItemId);
        if (!expectation) {
          issues.push("Une prestation non demandée a été ajoutée.");
          continue;
        }
        if (parsed.data.quantity !== expectation.quantity) {
          issues.push(`La quantité de ${parsed.data.catalogItemId} est incorrecte.`);
        }
        if (parsed.data.vatRate !== expectation.vatRateBasisPoints) {
          issues.push(`La TVA de ${parsed.data.catalogItemId} est incorrecte.`);
        }
        expected.delete(parsed.data.catalogItemId);
      }
      if (expected.size > 0) issues.push("Une ou plusieurs prestations demandées n’ont pas été ajoutées.");
    }

    const depositCalls = calls.filter((call) => call.name === "set_deposit");
    if (depositCalls.length !== 1) {
      issues.push("L’acompte doit être appliqué exactement une fois.");
    } else {
      const parsed = setDepositArgumentsSchema.safeParse(depositCalls[0].arguments);
      if (!parsed.success || parsed.data.depositRate !== 3_000) issues.push("L’acompte transmis doit être exactement 30 %.");
    }
  } else if (!quoteAssistantEvalScenarios.some((scenario) => scenario.id === scenarioId)) {
    issues.push("Scénario d’évaluation inconnu.");
  }

  return issues;
}
