import { describe, expect, it } from "vitest";

import {
  formatAmountInput,
  formatQuantityInput,
  formatRateInput,
  getQuoteLineValues,
  quoteFinancialSettingsSchema,
  quoteLineSchema,
} from "@/lib/validation/quote";

describe("quote validation", () => {
  it("normalizes manual financial values to integer storage units", () => {
    const result = quoteLineSchema.parse({
      catalogItemId: "",
      description: "Pose comprise",
      label: "Main d’œuvre",
      lineId: "",
      quantityMilliunits: "2,500",
      quoteId: "13000000-0000-4000-8000-000000000001",
      sectionId: "",
      unit: "heure",
      unitPriceHtCents: "55,90",
      vatRateBasisPoints: "20",
    });

    expect(result).toMatchObject({
      quantityMilliunits: 2500,
      unitPriceHtCents: 5590,
      vatRateBasisPoints: 2000,
    });
  });

  it("accepts an incomplete catalogue line while it is still being prepared", () => {
    const values = {
      catalogItemId: "13000000-0000-4000-8000-000000000001",
      description: "",
      label: "",
      lineId: "",
      quantityMilliunits: "1",
      quoteId: "23000000-0000-4000-8000-000000000001",
      sectionId: "",
      unit: "",
      unitPriceHtCents: "",
      vatRateBasisPoints: "",
    };
    expect(quoteLineSchema.safeParse(values).success).toBe(true);
  });

  it("rejects invalid quantities and VAT rates", () => {
    const base = {
      catalogItemId: "",
      description: "",
      label: "Déplacement",
      lineId: "",
      quantityMilliunits: "1",
      quoteId: "33000000-0000-4000-8000-000000000001",
      sectionId: "",
      unit: "forfait",
      unitPriceHtCents: "20",
      vatRateBasisPoints: "20",
    };
    expect(quoteLineSchema.safeParse({ ...base, quantityMilliunits: "0" }).success).toBe(false);
    expect(quoteLineSchema.safeParse({ ...base, vatRateBasisPoints: "100,01" }).success).toBe(false);
  });

  it("validates quote-level discount and deposit rates", () => {
    expect(quoteFinancialSettingsSchema.parse({ depositRateBasisPoints: "30", discountRateBasisPoints: "5,5", quoteId: "43000000-0000-4000-8000-000000000001" })).toMatchObject({ depositRateBasisPoints: 3000, discountRateBasisPoints: 550 });
    expect(quoteFinancialSettingsSchema.safeParse({ depositRateBasisPoints: "101", discountRateBasisPoints: "0", quoteId: "43000000-0000-4000-8000-000000000001" }).success).toBe(false);
  });

  it("collects form values and formats stored values for fields", () => {
    const formData = new FormData();
    formData.set("quoteId", "53000000-0000-4000-8000-000000000001");
    formData.set("quantity", "1,25");
    expect(getQuoteLineValues(formData)).toMatchObject({ quantityMilliunits: "1,25", quoteId: "53000000-0000-4000-8000-000000000001" });
    expect(formatAmountInput(5590)).toBe("55,90");
    expect(formatQuantityInput(1250)).toBe("1,25");
    expect(formatRateInput(550)).toBe("5,50");
  });
});
