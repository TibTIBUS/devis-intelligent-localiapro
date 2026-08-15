import OpenAI from "openai";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { describe, expect, it } from "vitest";

import { gradeQuoteAssistantEval, quoteAssistantEvalScenarios, type QuoteAssistantEvalCall } from "@/lib/ai/evals/quote-assistant-evals";
import { buildQuoteAssistantPrompt } from "@/lib/ai/prompts/quote-assistant";
import { addQuoteLineTool } from "@/lib/ai/tools/add-quote-line";
import { deleteQuoteLineTool, updateQuoteLineTool } from "@/lib/ai/tools/edit-quote-line";
import { setDepositTool, setDiscountTool } from "@/lib/ai/tools/quote-financial-settings";
import { setPaymentTermsTool, setValidityTool, setWorksiteAddressTool, updateQuoteNoteTool } from "@/lib/ai/tools/quote-metadata";
import { searchCatalogTool } from "@/lib/ai/tools/search-catalog";
import { parseOpenAIEnv } from "@/lib/validation/env";

const baseContext = {
  businessTrade: "Plomberie",
  contacts: [],
  depositRateBasisPoints: 3_000,
  discountRateBasisPoints: 0,
  note: null,
  paymentTerms: null,
  quoteId: "31000000-0000-4000-8000-000000000006",
  status: "draft" as const,
  validUntil: "2026-09-30",
  workAddressId: null,
  workAddresses: [],
};

async function runScenario(scenario: (typeof quoteAssistantEvalScenarios)[number]) {
  const env = parseOpenAIEnv(process.env);
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const input: ResponseInputItem[] = [{ content: scenario.userMessage, role: "user" }];
  const calls: QuoteAssistantEvalCall[] = [];
  const context = { ...baseContext, lines: scenario.contextLines ?? [] };

  for (let round = 0; round < 5; round += 1) {
    const response = await client.responses.create({
      input,
      instructions: buildQuoteAssistantPrompt(context),
      model: env.OPENAI_TEXT_MODEL,
      parallel_tool_calls: true,
      store: false,
      tools: [searchCatalogTool, addQuoteLineTool, updateQuoteLineTool, deleteQuoteLineTool, setDiscountTool, setDepositTool, setPaymentTermsTool, setValidityTool, setWorksiteAddressTool, updateQuoteNoteTool],
    });
    const functionCalls = response.output.filter((item) => item.type === "function_call");
    if (functionCalls.length === 0) break;

    input.push(...response.output as unknown as ResponseInputItem[]);
    for (const call of functionCalls) {
      const parsedArguments: unknown = JSON.parse(call.arguments);
      calls.push({ arguments: parsedArguments, name: call.name });
      const output = call.name === searchCatalogTool.name
        ? { items: scenario.catalogItems, priceSource: "catalog" }
        : { message: "Action appliquée côté serveur.", status: "applied" };
      input.push({ call_id: call.call_id, output: JSON.stringify(output), type: "function_call_output" });
    }
  }

  return calls;
}

describe("live quote assistant behavior", () => {
  it.each(quoteAssistantEvalScenarios)("$id", async (scenario) => {
    const calls = await runScenario(scenario);
    expect(gradeQuoteAssistantEval(scenario.id, calls), JSON.stringify(calls)).toEqual([]);
  });
});
