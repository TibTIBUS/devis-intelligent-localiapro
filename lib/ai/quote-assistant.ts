import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResponseInputItem } from "openai/resources/responses/responses";

import { createOpenAIClient } from "@/lib/ai/client";
import { buildQuoteAssistantPrompt, type QuoteAssistantContext } from "@/lib/ai/prompts/quote-assistant";
import { addQuoteLineTool, prepareAddQuoteLineTool } from "@/lib/ai/tools/add-quote-line";
import {
  deleteQuoteLineTool,
  prepareDeleteQuoteLineTool,
  prepareUpdateQuoteLineTool,
  updateQuoteLineTool,
} from "@/lib/ai/tools/edit-quote-line";
import {
  prepareRequestSendQuoteEmailTool,
  requestFinalizeQuoteTool,
  requestSendQuoteEmailTool,
} from "@/lib/ai/tools/quote-lifecycle";
import { prepareQuoteFinancialSettingTool, setDepositTool, setDiscountTool } from "@/lib/ai/tools/quote-financial-settings";
import {
  prepareQuoteMetadataTool,
  setPaymentTermsTool,
  setValidityTool,
  setWorksiteAddressTool,
  updateQuoteNoteTool,
} from "@/lib/ai/tools/quote-metadata";
import { executeSearchCatalogTool, searchCatalogTool } from "@/lib/ai/tools/search-catalog";
import { validateQuoteCompliance } from "@/lib/compliance/quote-compliance";
import { sendQuoteDocumentByEmail } from "@/lib/documents/email-actions";
import { logTechnicalError, type TechnicalLogContext } from "@/lib/observability/logger";
import {
  addCatalogQuoteLineFromAi,
  deleteQuoteLineFromAi,
  setQuoteFinancialRateFromAi,
  updateQuoteLineFromAi,
  updateQuoteMetadataFromAi,
} from "@/lib/quotes/ai-actions";
import { finalizeQuoteForOrganization } from "@/lib/quotes/finalize";
import type { AiConversationMessage } from "@/lib/validation/ai";

const MAX_TOOL_ROUNDS = 5;

type RunQuoteAssistantOptions = {
  actorUserId: string;
  context: QuoteAssistantContext;
  messages: AiConversationMessage[];
  organizationId: string;
  observability: TechnicalLogContext;
  supabase: SupabaseClient;
};

export async function runQuoteAssistant({
  actorUserId,
  context,
  messages,
  observability,
  organizationId,
  supabase,
}: RunQuoteAssistantOptions) {
  const { client, model } = createOpenAIClient();
  const input: ResponseInputItem[] = messages.map((message) => ({
    content: message.content,
    role: message.role,
  }));
  const appliedMutationKeys = new Set<string>();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    let response;
    try {
      response = await client.responses.create({
        input,
        instructions: buildQuoteAssistantPrompt(context),
        model,
        parallel_tool_calls: true,
        store: false,
        tools: [
          searchCatalogTool,
          addQuoteLineTool,
          updateQuoteLineTool,
          deleteQuoteLineTool,
          setDiscountTool,
          setDepositTool,
          setPaymentTermsTool,
          setValidityTool,
          setWorksiteAddressTool,
          updateQuoteNoteTool,
          requestFinalizeQuoteTool,
          requestSendQuoteEmailTool,
        ],
      });
    } catch (error) {
      logTechnicalError("ai.response_failed", observability, error);
      throw error;
    }

    const calls = response.output.filter((item) => item.type === "function_call");
    if (calls.length === 0) {
      const message = response.output_text.trim();
      if (!message) throw new Error("L’assistant n’a produit aucune réponse.");
      return { message };
    }

    input.push(...response.output as unknown as ResponseInputItem[]);

    for (const call of calls) {
      let output: unknown;
      try {
        if (call.name === searchCatalogTool.name) {
          output = await executeSearchCatalogTool(supabase, organizationId, call.arguments);
        } else if (call.name === addQuoteLineTool.name) {
          const prepared = await prepareAddQuoteLineTool(supabase, organizationId, call.arguments);
          if (!prepared.proposal) {
            output = prepared.output;
          } else {
            const mutationKey = [
              "add_quote_line",
              prepared.proposal.catalogItemId,
              prepared.proposal.lineKind,
              prepared.proposal.quantityMilliunits,
            ].join(":");

            if (appliedMutationKeys.has(mutationKey)) {
              output = {
                message: `${prepared.proposal.label} était déjà ajouté pour cette demande. L’appel répété a été ignoré.`,
                status: "duplicate_ignored",
              };
            } else {
              appliedMutationKeys.add(mutationKey);
              const applied = await addCatalogQuoteLineFromAi(
                supabase,
                organizationId,
                context.quoteId,
                {
                  catalogItemId: prepared.proposal.catalogItemId,
                  lineKind: prepared.proposal.lineKind,
                  quantityMilliunits: prepared.proposal.quantityMilliunits,
                  vatRateBasisPoints: null,
                },
              );
              output = {
                label: applied.label,
                message: `${applied.label} a été ajouté au devis. Le taux de TVA reste à compléter avant finalisation.`,
                status: "applied",
              };
            }
          }
        } else if (call.name === updateQuoteLineTool.name) {
          const prepared = await prepareUpdateQuoteLineTool(
            supabase,
            organizationId,
            context.quoteId,
            call.arguments,
          );
          const mutationKey = [
            "update_quote_line",
            prepared.proposal.quoteLineId,
            prepared.proposal.lineKind,
            prepared.proposal.quantityMilliunits,
          ].join(":");
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "Cette modification était déjà appliquée pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            await updateQuoteLineFromAi(supabase, organizationId, context.quoteId, {
              lineKind: prepared.proposal.lineKind,
              quantityMilliunits: prepared.proposal.quantityMilliunits,
              quoteLineId: prepared.proposal.quoteLineId,
            });
            output = { message: `${prepared.proposal.label} a été modifié.`, status: "applied" };
          }
        } else if (call.name === deleteQuoteLineTool.name) {
          const prepared = await prepareDeleteQuoteLineTool(
            supabase,
            organizationId,
            context.quoteId,
            call.arguments,
          );
          const mutationKey = `delete_quote_line:${prepared.proposal.quoteLineId}`;
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "Cette suppression était déjà appliquée pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            await deleteQuoteLineFromAi(
              supabase,
              organizationId,
              context.quoteId,
              prepared.proposal.quoteLineId,
            );
            output = { message: `${prepared.proposal.label} a été supprimé du devis.`, status: "applied" };
          }
        } else if ([setPaymentTermsTool.name, setValidityTool.name, setWorksiteAddressTool.name, updateQuoteNoteTool.name].includes(call.name)) {
          const proposal = prepareQuoteMetadataTool(call.name, call.arguments, context.workAddresses);
          const mutationKey = `${proposal.actionType}:${JSON.stringify(proposal)}`;
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "Ce paramètre était déjà appliqué pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            if (proposal.actionType === "set_payment_terms") {
              await updateQuoteMetadataFromAi(supabase, organizationId, context.quoteId, proposal);
            } else if (proposal.actionType === "set_validity") {
              await updateQuoteMetadataFromAi(supabase, organizationId, context.quoteId, proposal);
            } else if (proposal.actionType === "set_worksite_address") {
              await updateQuoteMetadataFromAi(supabase, organizationId, context.quoteId, proposal);
            } else if (proposal.actionType === "update_quote_note") {
              await updateQuoteMetadataFromAi(supabase, organizationId, context.quoteId, proposal);
            } else {
              throw new Error("Action de devis non prise en charge.");
            }
            output = { message: "Le paramètre du devis a été mis à jour.", status: "applied" };
          }
        } else if ([setDiscountTool.name, setDepositTool.name].includes(call.name)) {
          const proposal = prepareQuoteFinancialSettingTool(call.name, call.arguments, context);
          if (proposal.actionType !== "set_discount" && proposal.actionType !== "set_deposit") {
            throw new Error("Action financière non prise en charge.");
          }
          const mutationKey = `${proposal.actionType}:${proposal.rateBasisPoints}`;
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "Ce taux était déjà appliqué pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            await setQuoteFinancialRateFromAi(supabase, organizationId, context.quoteId, proposal);
            output = {
              message: proposal.actionType === "set_discount" ? "La remise a été mise à jour." : "L’acompte a été mis à jour.",
              status: "applied",
            };
          }
        } else if (call.name === requestFinalizeQuoteTool.name) {
          const mutationKey = "finalize_quote";
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "La finalisation a déjà été traitée pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            const compliance = await validateQuoteCompliance(supabase, context.quoteId);
            if (!compliance.valid) {
              output = {
                issues: compliance.errors.map((issue) => issue.message),
                message: "Le devis n’a pas été finalisé car des informations obligatoires manquent.",
                status: "blocked",
              };
            } else {
              const result = await finalizeQuoteForOrganization(organizationId, context.quoteId, actorUserId);
              if (!result.success) throw new Error("La finalisation du devis a échoué.");
              output = { message: `Le devis a été finalisé sous le numéro ${result.quoteNumber}.`, status: "applied" };
            }
          }
        } else if (call.name === requestSendQuoteEmailTool.name) {
          const proposal = prepareRequestSendQuoteEmailTool(call.arguments, context.contacts);
          if (proposal.actionType !== "send_quote_email") {
            throw new Error("Action d’envoi non prise en charge.");
          }
          const mutationKey = `send_quote_email:${proposal.contactId}`;
          if (appliedMutationKeys.has(mutationKey)) {
            output = { message: "Cet envoi a déjà été traité pour cette demande.", status: "duplicate_ignored" };
          } else {
            appliedMutationKeys.add(mutationKey);
            const result = await sendQuoteDocumentByEmail(
              supabase,
              organizationId,
              context.quoteId,
              proposal.contactId,
              observability,
            );
            output = { message: `Le devis a été envoyé à ${result.recipientEmail}.`, status: "applied" };
          }
        } else {
          throw new Error("L’assistant a demandé un outil non autorisé.");
        }
      } catch (error) {
        logTechnicalError("ai.tool_call_failed", { ...observability, toolName: call.name }, error);
        output = {
          message: error instanceof Error ? error.message : "Cette action n’a pas pu être appliquée.",
          status: "failed",
        };
      }

      input.push({
        call_id: call.call_id,
        output: JSON.stringify(output),
        type: "function_call_output",
      });
    }
  }

  throw new Error("L’assistant a dépassé le nombre d’étapes autorisé.");
}
