import type { AiQuoteActionProposal } from "@/lib/validation/ai";

/**
 * Construit le corps de requête attendu par /api/ai/quote-actions/confirm à
 * partir d'une proposition en attente. Partagé entre l'assistant texte et
 * l'assistant vocal pour éviter deux implémentations divergentes du même
 * contrat de confirmation.
 */
export function buildConfirmActionPayload(
  proposal: AiQuoteActionProposal,
  quoteId: string,
  overrides: { lineKind?: string; vatRate?: string } = {},
) {
  switch (proposal.actionType) {
    case "add_quote_line":
      return {
        actionType: proposal.actionType,
        proposal: {
          catalogItemId: proposal.catalogItemId,
          lineKind: overrides.lineKind ?? proposal.lineKind,
          quantityMilliunits: proposal.quantityMilliunits,
        },
        quoteId,
        vatRate: overrides.vatRate ?? "",
      };
    case "update_quote_line":
      return {
        actionType: proposal.actionType,
        proposal: {
          lineKind: proposal.lineKind,
          quantityMilliunits: proposal.quantityMilliunits,
          quoteLineId: proposal.quoteLineId,
        },
        quoteId,
      };
    case "delete_quote_line":
      return { actionType: proposal.actionType, proposal: { quoteLineId: proposal.quoteLineId }, quoteId };
    case "set_payment_terms":
      return { actionType: proposal.actionType, proposal: { paymentTerms: proposal.paymentTerms }, quoteId };
    case "set_validity":
      return { actionType: proposal.actionType, proposal: { validUntil: proposal.validUntil }, quoteId };
    case "set_worksite_address":
      return { actionType: proposal.actionType, proposal: { workAddressId: proposal.workAddressId }, quoteId };
    case "update_quote_note":
      return { actionType: proposal.actionType, proposal: { note: proposal.note }, quoteId };
    case "set_discount":
    case "set_deposit":
      return {
        actionType: proposal.actionType,
        proposal: { currentRateBasisPoints: proposal.currentRateBasisPoints, rateBasisPoints: proposal.rateBasisPoints },
        quoteId,
      };
    case "finalize_quote":
      return { actionType: proposal.actionType, proposal: {}, quoteId };
    case "send_quote_email":
      return { actionType: proposal.actionType, proposal: { contactId: proposal.contactId }, quoteId };
    default: {
      const exhaustive: never = proposal;
      throw new Error(`Type de proposition non pris en charge : ${JSON.stringify(exhaustive)}`);
    }
  }
}
