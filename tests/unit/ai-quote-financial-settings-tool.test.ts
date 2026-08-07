import { describe, expect, it } from "vitest";

import {
  prepareQuoteFinancialSettingTool,
  setDepositTool,
  setDiscountTool,
} from "@/lib/ai/tools/quote-financial-settings";

const current = { depositRateBasisPoints: 3_000, discountRateBasisPoints: 500 };

describe("quote financial setting AI tools", () => {
  it("exposes strict schemas without amounts or organization identifiers", () => {
    for (const tool of [setDiscountTool, setDepositTool]) {
      expect(tool.strict).toBe(true);
      expect(tool.parameters.additionalProperties).toBe(false);
      expect(tool.parameters.properties).not.toHaveProperty("amount");
      expect(tool.parameters.properties).not.toHaveProperty("organizationId");
    }
  });

  it("prepares an explicit discount without calculating an amount", () => {
    expect(prepareQuoteFinancialSettingTool(setDiscountTool.name, JSON.stringify({ discountRate: "10,5" }), current)).toEqual({
      actionType: "set_discount",
      currentRateBasisPoints: 500,
      rateBasisPoints: 1_050,
    });
  });

  it("prepares an explicit deposit without calculating an amount", () => {
    expect(prepareQuoteFinancialSettingTool(setDepositTool.name, JSON.stringify({ depositRate: "25" }), current)).toEqual({
      actionType: "set_deposit",
      currentRateBasisPoints: 3_000,
      rateBasisPoints: 2_500,
    });
  });
});
