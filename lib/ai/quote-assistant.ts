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
import { executeSearchCatalogTool, searchCatalogTool } from "@/lib/ai/tools/search-catalog";
import type { AiConversationMessage, AiQuoteActionProposal } from "@/lib/validation/ai";

const MAX_TOOL_ROUNDS = 3;

type RunQuoteAssistantOptions = {
  context: QuoteAssistantContext;
  messages: AiConversationMessage[];
  organizationId: string;
  supabase: SupabaseClient;
};

export async function runQuoteAssistant({
  context,
  messages,
  organizationId,
  supabase,
}: RunQuoteAssistantOptions) {
  const { client, model } = createOpenAIClient();
  let pendingAction: AiQuoteActionProposal | undefined;
  const input: ResponseInputItem[] = messages.map((message) => ({
    content: message.content,
    role: message.role,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.responses.create({
      input,
      instructions: buildQuoteAssistantPrompt(context),
      model,
      parallel_tool_calls: false,
      store: false,
      tools: [searchCatalogTool, addQuoteLineTool, updateQuoteLineTool, deleteQuoteLineTool],
    });
    const calls = response.output.filter((item) => item.type === "function_call");

    if (calls.length === 0) {
      const message = response.output_text.trim();
      if (!message) throw new Error("L’assistant n’a produit aucune réponse.");
      return { message, pendingAction };
    }

    // Le SDK expose un type de sortie plus large que les outils autorisés ici.
    // Avec uniquement des fonctions personnalisées, ces éléments sont rejouables comme entrée.
    input.push(...response.output as unknown as ResponseInputItem[]);
    for (const call of calls) {
      let output: unknown;
      if (call.name === searchCatalogTool.name) {
        output = await executeSearchCatalogTool(
          supabase,
          organizationId,
          call.arguments,
        );
      } else if (call.name === addQuoteLineTool.name) {
        const result = await prepareAddQuoteLineTool(
          supabase,
          organizationId,
          call.arguments,
        );
        if (result.proposal) {
          if (pendingAction) throw new Error("Une seule proposition peut être préparée à la fois.");
          pendingAction = result.proposal;
        }
        output = result.output;
      } else if (call.name === updateQuoteLineTool.name) {
        const result = await prepareUpdateQuoteLineTool(
          supabase,
          organizationId,
          context.quoteId,
          call.arguments,
        );
        if (pendingAction) throw new Error("Une seule proposition peut être préparée à la fois.");
        pendingAction = result.proposal;
        output = result.output;
      } else if (call.name === deleteQuoteLineTool.name) {
        const result = await prepareDeleteQuoteLineTool(
          supabase,
          organizationId,
          context.quoteId,
          call.arguments,
        );
        if (pendingAction) throw new Error("Une seule proposition peut être préparée à la fois.");
        pendingAction = result.proposal;
        output = result.output;
      } else {
        throw new Error("L’assistant a demandé un outil non autorisé.");
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
