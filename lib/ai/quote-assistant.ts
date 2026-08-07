import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResponseInputItem } from "openai/resources/responses/responses";

import { createOpenAIClient } from "@/lib/ai/client";
import { buildQuoteAssistantPrompt, type QuoteAssistantContext } from "@/lib/ai/prompts/quote-assistant";
import { executeSearchCatalogTool, searchCatalogTool } from "@/lib/ai/tools/search-catalog";
import type { AiConversationMessage } from "@/lib/validation/ai";

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
      tools: [searchCatalogTool],
    });
    const calls = response.output.filter((item) => item.type === "function_call");

    if (calls.length === 0) {
      const message = response.output_text.trim();
      if (!message) throw new Error("L’assistant n’a produit aucune réponse.");
      return message;
    }

    input.push(...calls);
    for (const call of calls) {
      if (call.name !== searchCatalogTool.name) {
        throw new Error("L’assistant a demandé un outil non autorisé.");
      }
      const output = await executeSearchCatalogTool(
        supabase,
        organizationId,
        call.arguments,
      );
      input.push({
        call_id: call.call_id,
        output: JSON.stringify(output),
        type: "function_call_output",
      });
    }
  }

  throw new Error("L’assistant a dépassé le nombre d’étapes autorisé.");
}
