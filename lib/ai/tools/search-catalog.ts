import type { SupabaseClient } from "@supabase/supabase-js";

import { searchCatalogForAssistant } from "@/lib/catalog/assistant-service";
import { searchCatalogArgumentsSchema } from "@/lib/validation/ai";

export const searchCatalogTool = {
  type: "function" as const,
  name: "search_catalog",
  description: "Recherche au maximum huit prestations pertinentes dans le catalogue de l’entreprise courante.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Quelques mots décrivant précisément la prestation recherchée.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

export async function executeSearchCatalogTool(
  client: SupabaseClient,
  organizationId: string,
  rawArguments: string,
) {
  const parsed = searchCatalogArgumentsSchema.parse(JSON.parse(rawArguments));
  const items = await searchCatalogForAssistant(client, organizationId, parsed.query);

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      unitPriceHtCents: item.unit_price_ht_cents,
    })),
    priceSource: "catalog",
  };
}
