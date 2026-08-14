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
  vat_rate_basis_points: number | null;
};

async function getQuoteLineForAssistant(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  quoteLineId: string,
) {
  const { data, error } = await client
    .from("quote_lines")
    .select("id, label, line_kind, quantity_milliunits, unit, vat_rate_basis_points")
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
  description: "Modifie immédiatement une ligne du devis actif. Quantité, nature et TVA ne changent que si l’artisan les demande explicitement.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      quoteLineId: {
        type: "string",
        description: "Identifiant exact d’une ligne présente dans le contexte du devis actif.",
      },
      quantity: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Nouvelle quantité si elle est explicitement demandée, sinon null.",
      },
      lineKind: {
        anyOf: [
          { type: "string", enum: ["labor", "material", "travel", "service", "other"] },
          { type: "null" },
        ],
        description: "Nouvelle nature si elle est explicitement demandée, sinon null.",
      },
      vatRate: {
        anyOf: [{ type: "string" }, { type: "null" }],
        description: "Nouveau taux de TVA exact en pourcentage si l’artisan le demande, sinon null.",
      },
    },
    required: ["quoteLineId", "quantity", "lineKind", "vatRate"],
    additionalProperties: false,
  },
};

export const deleteQuoteLineTool = {
  type: "function" as const,
  name: "delete_quote_line",
  description: "Supprime immédiatement une ligne du devis actif lorsqu’elle est clairement identifiée.",
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
      message: "La modification a été validée côté serveur et peut être appliquée immédiatement.",
      status: "confirmation_required",
    },
    proposal: {
      actionType: "update_quote_line",
      currentLineKind: line.line_kind,
      currentQuantityMilliunits: line.quantity_milliunits,
      currentVatRateBasisPoints: line.vat_rate_basis_points,
      label: line.label,
      lineKind: parsed.lineKind ?? line.line_kind,
      quantityMilliunits: parsed.quantity === null ? line.quantity_milliunits : parseAiQuantityToMilliunits(parsed.quantity),
      quoteLineId: line.id,
      unit: line.unit,
      vatRateBasisPoints: parsed.vatRate ?? line.vat_rate_basis_points ?? 2_000,
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
      message: "La suppression a été validée côté serveur et peut être appliquée immédiatement.",
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
