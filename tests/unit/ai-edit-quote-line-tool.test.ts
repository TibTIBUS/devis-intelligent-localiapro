import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  deleteQuoteLineTool,
  prepareDeleteQuoteLineTool,
  prepareUpdateQuoteLineTool,
  updateQuoteLineTool,
} from "@/lib/ai/tools/edit-quote-line";

const quoteId = "31000000-0000-4000-8000-000000000001";
const quoteLineId = "41000000-0000-4000-8000-000000000001";

function quoteLineClient(data: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  const chain = { eq: vi.fn(), maybeSingle };
  chain.eq.mockReturnValue(chain);
  const select = vi.fn(() => chain);
  return {
    client: { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient,
    eq: chain.eq,
  };
}

const line = {
  id: quoteLineId,
  label: "Pose robinet",
  line_kind: "labor",
  quantity_milliunits: 2_000,
  unit: "heure",
};

describe("controlled quote line AI tools", () => {
  it("uses strict schemas without financial or organization arguments", () => {
    for (const tool of [updateQuoteLineTool, deleteQuoteLineTool]) {
      expect(tool.strict).toBe(true);
      expect(tool.parameters.additionalProperties).toBe(false);
      expect(tool.parameters.properties).not.toHaveProperty("organizationId");
      expect(tool.parameters.properties).not.toHaveProperty("unitPriceHtCents");
      expect(tool.parameters.properties).not.toHaveProperty("vatRateBasisPoints");
    }
  });

  it("prepares an update from a line re-read in the active quote", async () => {
    const { client, eq } = quoteLineClient(line);
    const result = await prepareUpdateQuoteLineTool(
      client,
      "organization-1",
      quoteId,
      JSON.stringify({ lineKind: "service", quantity: "3,5", quoteLineId }),
    );

    expect(eq).toHaveBeenCalledWith("organization_id", "organization-1");
    expect(eq).toHaveBeenCalledWith("quote_id", quoteId);
    expect(result.proposal).toMatchObject({
      actionType: "update_quote_line",
      currentQuantityMilliunits: 2_000,
      lineKind: "service",
      quantityMilliunits: 3_500,
      quoteLineId,
    });
  });

  it("prepares deletion without deleting the line", async () => {
    const { client } = quoteLineClient(line);
    const result = await prepareDeleteQuoteLineTool(
      client,
      "organization-1",
      quoteId,
      JSON.stringify({ quoteLineId }),
    );

    expect(result.output.status).toBe("confirmation_required");
    expect(result.proposal).toMatchObject({ actionType: "delete_quote_line", quoteLineId });
  });

  it("rejects a line outside the active quote", async () => {
    const { client } = quoteLineClient(null);
    await expect(prepareDeleteQuoteLineTool(
      client,
      "organization-1",
      quoteId,
      JSON.stringify({ quoteLineId }),
    )).rejects.toThrow("n’appartient pas au devis actif");
  });
});
