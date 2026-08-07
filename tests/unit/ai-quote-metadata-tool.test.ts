import { describe, expect, it } from "vitest";

import {
  prepareQuoteMetadataTool,
  setPaymentTermsTool,
  setValidityTool,
  setWorksiteAddressTool,
  updateQuoteNoteTool,
} from "@/lib/ai/tools/quote-metadata";

const addressId = "8ba9c847-da8c-4dfa-b01a-1d88da690b9d";
const addresses = [{ id: addressId, label: "Chantier — 2 rue du Test, Paris" }];

describe("quote metadata AI tools", () => {
  it("exposes strict schemas without organization identifiers", () => {
    for (const tool of [setPaymentTermsTool, setValidityTool, setWorksiteAddressTool, updateQuoteNoteTool]) {
      expect(tool.strict).toBe(true);
      expect(tool.parameters.additionalProperties).toBe(false);
      expect(tool.parameters.properties).not.toHaveProperty("organizationId");
    }
  });

  it("prepares exact values without writing or transforming content", () => {
    expect(prepareQuoteMetadataTool(setPaymentTermsTool.name, JSON.stringify({ paymentTerms: "Paiement à réception" }), addresses)).toEqual({ actionType: "set_payment_terms", paymentTerms: "Paiement à réception" });
    expect(prepareQuoteMetadataTool(setValidityTool.name, JSON.stringify({ validUntil: "2026-09-30" }), addresses)).toEqual({ actionType: "set_validity", validUntil: "2026-09-30" });
    expect(prepareQuoteMetadataTool(updateQuoteNoteTool.name, JSON.stringify({ note: "Protéger le parquet" }), addresses)).toEqual({ actionType: "update_quote_note", note: "Protéger le parquet" });
  });

  it("accepts only an address from the active customer context", () => {
    expect(prepareQuoteMetadataTool(setWorksiteAddressTool.name, JSON.stringify({ workAddressId: addressId }), addresses)).toMatchObject({ actionType: "set_worksite_address", addressLabel: addresses[0].label });
    expect(() => prepareQuoteMetadataTool(setWorksiteAddressTool.name, JSON.stringify({ workAddressId: "2f3023a6-3bb4-4d3c-a0ab-fc297a62fb23" }), addresses)).toThrow("n’appartient pas");
  });
});
