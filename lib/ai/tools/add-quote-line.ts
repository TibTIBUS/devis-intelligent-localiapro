import type { SupabaseClient } from "@supabase/supabase-js";

import { getCatalogItemForAssistant } from "@/lib/catalog/assistant-service";
import {
  addQuoteLineArgumentsSchema,
  parseAiQuantityToMilliunits,
  type AiQuoteLineProposal,
} from "@/lib/validation/ai";

const DEFAULT_VAT_RATE_BASIS_POINTS = 2_000;

export const addQuoteLineTool = {
  type: "function" as const,
  name: "add_quote_line",
  description: "Ajoute une prestation du catalogue au devis actif. Le serveur relit toujours la prestation et son prix avant l’écriture. La TVA est de 20 % par défaut, sauf taux explicitement demandé par l’artisan.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      catalogItemId: {
        type: "string",
        description: "Identifiant exact renvoyé par search_catalog.",
      },
      lineKind: {
        type: "string",
        enum: ["labor", "material", "travel", "service", "other"],
        description: "Nature de la prestation explicitement demandée.",
      },
      quantity: {
        type: "string",
        description: "Quantité positive exprimée en unité catalogue, sans calcul de montant.",
      },
      vatRate: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Taux de TVA exact en pourcentage si l’artisan le précise, par exemple 10 ou 5.5. Sinon null : le serveur appliquera 20 %.",
      },
    },
    required: ["catalogItemId", "lineKind", "quantity", "vatRate"],
    additionalProperties: false,
  },
};

export type AddQuoteLineToolResult = {
  output: {
    message: string;
    status: "confirmation_required" | "missing_catalog_price";
  };
  proposal?: AiQuoteLineProposal;
};

export async function prepareAddQuoteLineTool(
  client: SupabaseClient,
  organizationId: string,
  rawArguments: string,
): Promise<AddQuoteLineToolResult> {
  const parsed = addQuoteLineArgumentsSchema.parse(JSON.parse(rawArguments));
  const item = await getCatalogItemForAssistant(
    client,
    organizationId,
    parsed.catalogItemId,
  );
  if (!item) throw new Error("La prestation demandée n’appartient pas au catalogue.");

  if (item.unit_price_ht_cents === null) {
    return {
      output: {
        message: `Le catalogue ne contient aucun prix pour « ${item.name} ». Demande à l’artisan de renseigner le tarif avant tout ajout.`,
        status: "missing_catalog_price",
      },
    };
  }

  const proposal: AiQuoteLineProposal = {
    actionType: "add_quote_line",
    catalogItemId: item.id,
    label: item.name,
    lineKind: parsed.lineKind,
    quantityMilliunits: parseAiQuantityToMilliunits(parsed.quantity),
    unit: item.unit,
    unitPriceHtCents: item.unit_price_ht_cents,
    vatRateBasisPoints: parsed.vatRate ?? DEFAULT_VAT_RATE_BASIS_POINTS,
  };

  return {
    output: {
      message: "La prestation a été validée côté serveur et peut être ajoutée immédiatement.",
      status: "confirmation_required",
    },
    proposal,
  };
}
