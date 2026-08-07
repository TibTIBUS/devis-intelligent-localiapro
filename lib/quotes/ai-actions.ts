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

export async function undoLastAiQuoteAction(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
) {
  const { data, error } = await client.rpc("undo_last_ai_quote_action", {
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });
  const result = data?.[0] as { action_id: string; removed_line_id: string } | undefined;
  if (error || !result) throw new Error("Aucune action récente ne peut être annulée.");
  return result;
}
