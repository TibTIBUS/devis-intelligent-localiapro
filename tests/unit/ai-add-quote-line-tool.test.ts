import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { addQuoteLineTool, prepareAddQuoteLineTool } from "@/lib/ai/tools/add-quote-line";

const catalogItemId = "13000000-0000-4000-8000-000000000001";

function catalogClient(unitPriceHtCents: number | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      category_id: null,
      description: null,
      id: catalogItemId,
      name: "Main-d’œuvre plomberie",
      unit: "heure",
      unit_price_ht_cents: unitPriceHtCents,
    },
    error: null,
  });
  const eqId = vi.fn(() => ({ maybeSingle }));
  const eqOrganization = vi.fn(() => ({ eq: eqId }));
  const select = vi.fn(() => ({ eq: eqOrganization }));
  return { client: { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient, eqOrganization };
}

describe("add quote line AI tool", () => {
  it("uses strict arguments without exposing financial values or organization data", () => {
    expect(addQuoteLineTool.strict).toBe(true);
    expect(addQuoteLineTool.parameters.additionalProperties).toBe(false);
    expect(addQuoteLineTool.parameters.properties).not.toHaveProperty("organizationId");
    expect(addQuoteLineTool.parameters.properties).not.toHaveProperty("unitPriceHtCents");
    expect(addQuoteLineTool.parameters.properties).not.toHaveProperty("vatRateBasisPoints");
  });

  it("builds a directly applicable proposal from the authoritative catalog price with 20 % VAT by default", async () => {
    const { client, eqOrganization } = catalogClient(5_500);
    const result = await prepareAddQuoteLineTool(client, "organization-1", JSON.stringify({
      catalogItemId,
      lineKind: "labor",
      quantity: "4",
      vatRate: null,
    }));

    expect(eqOrganization).toHaveBeenCalledWith("organization_id", "organization-1");
    expect(result.output.status).toBe("ready_to_apply");
    expect(result.proposal).toMatchObject({
      actionType: "add_quote_line",
      catalogItemId,
      quantityMilliunits: 4_000,
      unitPriceHtCents: 5_500,
      vatRateBasisPoints: 2_000,
    });
  });

  it("keeps an explicitly requested VAT rate", async () => {
    const { client } = catalogClient(5_500);
    const result = await prepareAddQuoteLineTool(client, "organization-1", JSON.stringify({
      catalogItemId,
      lineKind: "labor",
      quantity: "4",
      vatRate: "10",
    }));

    expect(result.proposal?.vatRateBasisPoints).toBe(1_000);
  });

  it("refuses to propose a line when the catalog price is missing", async () => {
    const { client } = catalogClient(null);
    const result = await prepareAddQuoteLineTool(client, "organization-1", JSON.stringify({
      catalogItemId,
      lineKind: "service",
      quantity: "1",
      vatRate: null,
    }));

    expect(result.output.status).toBe("missing_catalog_price");
    expect(result.proposal).toBeUndefined();
  });
});
