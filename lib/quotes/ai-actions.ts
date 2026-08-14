import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiQuoteLineProposal } from "@/lib/validation/ai";

type AddCatalogQuoteLineInput = Pick<
  AiQuoteLineProposal,
  "catalogItemId" | "lineKind" | "quantityMilliunits"
> & { vatRateBasisPoints: number | null };

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

export async function updateQuoteMetadataFromAi(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  input:
    | { actionType: "set_payment_terms"; paymentTerms: string }
    | { actionType: "set_validity"; validUntil: string }
    | { actionType: "set_worksite_address"; workAddressId: string }
    | { actionType: "update_quote_note"; note: string },
) {
  const rpcByAction = {
    set_payment_terms: ["set_ai_quote_payment_terms", { p_payment_terms: input.actionType === "set_payment_terms" ? input.paymentTerms : "" }],
    set_validity: ["set_ai_quote_validity", { p_valid_until: input.actionType === "set_validity" ? input.validUntil : "" }],
    set_worksite_address: ["set_ai_quote_worksite_address", { p_work_address_id: input.actionType === "set_worksite_address" ? input.workAddressId : "" }],
    update_quote_note: ["update_ai_quote_note", { p_note: input.actionType === "update_quote_note" ? input.note : "" }],
  } as const;
  const [name, specificArgs] = rpcByAction[input.actionType];
  const { data, error } = await client.rpc(name, {
    p_organization_id: organizationId,
    p_quote_id: quoteId,
    ...specificArgs,
  });
  const result = data?.[0] as { action_id: string } | undefined;
  if (error || !result) throw new Error("Impossible de modifier ce paramètre du devis.");
  return result;
}

export async function setQuoteFinancialRateFromAi(
  client: SupabaseClient,
  organizationId: string,
  quoteId: string,
  input: { actionType: "set_discount" | "set_deposit"; currentRateBasisPoints: number; rateBasisPoints: number },
) {
  const name = input.actionType === "set_discount" ? "set_ai_quote_discount" : "set_ai_quote_deposit";
  const rateArgument = input.actionType === "set_discount"
    ? { p_discount_rate_basis_points: input.rateBasisPoints }
    : { p_deposit_rate_basis_points: input.rateBasisPoints };
  const { data, error } = await client.rpc(name, {
    p_organization_id: organizationId,
    p_quote_id: quoteId,
    p_expected_rate_basis_points: input.currentRateBasisPoints,
    ...rateArgument,
  });
  const result = data?.[0] as { action_id: string } | undefined;
  if (error || !result) throw new Error("Impossible de modifier ce taux du devis.");
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
    action_type: "add_quote_line" | "update_quote_line" | "delete_quote_line" | "set_discount" | "set_deposit" | "set_payment_terms" | "set_validity" | "set_worksite_address" | "update_quote_note";
    affected_line_id: string | null;
  } | undefined;
  if (error || !result) throw new Error("Aucune action récente ne peut être annulée.");
  return result;
}
