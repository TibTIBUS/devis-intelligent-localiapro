import type { SupabaseClient } from "@supabase/supabase-js";

import { getCatalogItemForAssistant } from "@/lib/catalog/assistant-service";
import {
  addQuoteLineArgumentsSchema,
  parseAiQuantityToMilliunits,
  type AiQuoteLineProposal,
} from "@/lib/validation/ai";

export const addQuoteLineTool = {
  type: "function" as const,
  name: "add_quote_line",
  description: "Ajoute une prestation du catalogue au devis actif. Le serveur relit toujours la prestation et son prix avant l’écriture. La TVA peut rester à compléter.",
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
    },
    required: ["catalogItemId", "lineKind", "quantity"],
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
  };

  return {
    output: {
      message: "La prestation a été validée côté serveur et peut être ajoutée immédiatement.",
      status: "confirmation_required",
    },
    proposal,
  };
}
