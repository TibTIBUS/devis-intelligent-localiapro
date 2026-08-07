import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiQuoteLineProposal } from "@/lib/validation/ai";

type AddCatalogQuoteLineInput = Pick<
  AiQuoteLineProposal,
  "catalogItemId" | "lineKind" | "quantityMilliunits"
> & { vatRateBasisPoints: number };

export async function addCatalogQuoteLineFromAi(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  input: AddCatalogQuoteLineInput,
) {
  const { data, error } = await client.rpc("add_catalog_quote_line", {
    p_catalog_item_id: input.catalogItemId,
    p_line_kind: input.lineKind,
    p_organization_id: organizationId,
    p_quantity_milliunits: input.quantityMilliunits,
    p_quote_id: quoteId,
    p_vat_rate_basis_points: input.vatRateBasisPoints,
  });

  const result = data?.[0] as {
    action_id: string;
    label: string;
    line_id: string;
    unit: string;
    unit_price_ht_cents: number;
  } | undefined;
  if (error || !result) throw new Error("Impossible d’ajouter cette prestation au devis.");
  return result;
}

export async function updateQuoteLineFromAi(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  input: { lineKind: AiQuoteLineProposal["lineKind"]; quantityMilliunits: number; quoteLineId: string },
) {
  const { data, error } = await client.rpc("update_ai_quote_line", {
    p_line_id: input.quoteLineId,
    p_line_kind: input.lineKind,
    p_organization_id: organizationId,
    p_quantity_milliunits: input.quantityMilliunits,
    p_quote_id: quoteId,
  });
  const result = data?.[0] as { action_id: string; label: string; line_id: string } | undefined;
  if (error || !result) throw new Error("Impossible de modifier cette ligne de devis.");
  return result;
}

export async function deleteQuoteLineFromAi(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  quoteLineId: string,
) {
  const { data, error } = await client.rpc("delete_ai_quote_line", {
    p_line_id: quoteLineId,
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });
  const result = data?.[0] as { action_id: string; label: string; line_id: string } | undefined;
  if (error || !result) throw new Error("Impossible de supprimer cette ligne de devis.");
  return result;
}

export async function undoLastAiQuoteAction(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
) {
  const { data, error } = await client.rpc("undo_last_ai_quote_action", {
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });
  const result = data?.[0] as {
    action_id: string;
    action_type: "add_quote_line" | "update_quote_line" | "delete_quote_line";
    affected_line_id: string;
  } | undefined;
  if (error || !result) throw new Error("Aucune action récente ne peut être annulée.");
  return result;
}
