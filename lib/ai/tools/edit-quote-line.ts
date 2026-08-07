import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deleteQuoteLineArgumentsSchema,
  parseAiQuantityToMilliunits,
  updateQuoteLineArgumentsSchema,
  type AiDeleteQuoteLineProposal,
  type AiUpdateQuoteLineProposal,
} from "@/lib/validation/ai";

type AssistantQuoteLine = {
  id: string;
  label: string;
  line_kind: "labor" | "material" | "travel" | "service" | "other";
  quantity_milliunits: number;
  unit: string;
};

async function getQuoteLineForAssistant(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  quoteLineId: string,
) {
  const { data, error } = await client
    .from("quote_lines")
    .select("id, label, line_kind, quantity_milliunits, unit")
    .eq("organization_id", organizationId)
    .eq("quote_id", quoteId)
    .eq("id", quoteLineId)
    .maybeSingle();

  if (error) throw new Error("Impossible de vérifier cette ligne de devis.");
  return data as AssistantQuoteLine | null;
}

export const updateQuoteLineTool = {
  type: "function" as const,
  name: "update_quote_line",
  description: "Prépare uniquement le changement de quantité et de nature d’une ligne du devis actif. Une confirmation humaine distincte reste obligatoire.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      quoteLineId: {
        type: "string",
        description: "Identifiant exact d’une ligne présente dans le contexte du devis actif.",
      },
      quantity: {
        type: "string",
        description: "Nouvelle quantité positive explicitement donnée par l’artisan.",
      },
      lineKind: {
        type: "string",
        enum: ["labor", "material", "travel", "service", "other"],
        description: "Nouvelle nature explicitement demandée, ou nature actuelle si elle ne change pas.",
      },
    },
    required: ["quoteLineId", "quantity", "lineKind"],
    additionalProperties: false,
  },
};

export const deleteQuoteLineTool = {
  type: "function" as const,
  name: "delete_quote_line",
  description: "Prépare uniquement la suppression d’une ligne du devis actif. Une confirmation humaine distincte reste obligatoire.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      quoteLineId: {
        type: "string",
        description: "Identifiant exact d’une ligne présente dans le contexte du devis actif.",
      },
    },
    required: ["quoteLineId"],
    additionalProperties: false,
  },
};

export async function prepareUpdateQuoteLineTool(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  rawArguments: string,
): Promise<{ output: { message: string; status: "confirmation_required" }; proposal: AiUpdateQuoteLineProposal }> {
  const parsed = updateQuoteLineArgumentsSchema.parse(JSON.parse(rawArguments));
  const line = await getQuoteLineForAssistant(client, organizationId, quoteId, parsed.quoteLineId);
  if (!line) throw new Error("Cette ligne n’appartient pas au devis actif.");

  return {
    output: {
      message: "La modification est prête. Aucune donnée n’est encore enregistrée : demande à l’artisan d’utiliser la confirmation affichée.",
      status: "confirmation_required",
    },
    proposal: {
      actionType: "update_quote_line",
      currentLineKind: line.line_kind,
      currentQuantityMilliunits: line.quantity_milliunits,
      label: line.label,
      lineKind: parsed.lineKind,
      quantityMilliunits: parseAiQuantityToMilliunits(parsed.quantity),
      quoteLineId: line.id,
      unit: line.unit,
    },
  };
}

export async function prepareDeleteQuoteLineTool(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  rawArguments: string,
): Promise<{ output: { message: string; status: "confirmation_required" }; proposal: AiDeleteQuoteLineProposal }> {
  const parsed = deleteQuoteLineArgumentsSchema.parse(JSON.parse(rawArguments));
  const line = await getQuoteLineForAssistant(client, organizationId, quoteId, parsed.quoteLineId);
  if (!line) throw new Error("Cette ligne n’appartient pas au devis actif.");

  return {
    output: {
      message: "La suppression est prête. La ligne existe toujours : demande à l’artisan d’utiliser la confirmation affichée.",
      status: "confirmation_required",
    },
    proposal: {
      actionType: "delete_quote_line",
      label: line.label,
      lineKind: line.line_kind,
      quantityMilliunits: line.quantity_milliunits,
      quoteLineId: line.id,
      unit: line.unit,
    },
  };
}
