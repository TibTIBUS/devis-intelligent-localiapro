import { describe, expect, it } from "vitest";

import {
  formatAmountInput,
  formatQuantityInput,
  formatRateInput,
  getQuoteLineValues,
  getQuoteSectionValues,
  quoteFinancialSettingsSchema,
  quoteLineSchema,
  quoteSearchSchema,
  quoteSectionSchema,
} from "@/lib/validation/quote";
import { filterQuotesByCustomerName } from "@/lib/quotes/queries";

describe("quote validation", () => {
  it("normalizes manual financial values to integer storage units", () => {
    const result = quoteLineSchema.parse({
      catalogItemId: "",
      description: "Pose comprise",
      label: "Main d’œuvre",
      lineId: "",
      lineKind: "labor",
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
      lineKind: "service",
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
      lineKind: "travel",
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
    const details = {
      depositRateBasisPoints: "30",
      discountRateBasisPoints: "5,5",
      isQuoteFree: "paid",
      preparationFeeHtCents: "25",
      preparationFeeVatRateBasisPoints: "20",
      quoteId: "43000000-0000-4000-8000-000000000001",
      travelFeeApplicable: "no",
      validUntil: "2026-12-31",
      workAddressId: "53000000-0000-4000-8000-000000000001",
    };
    expect(quoteFinancialSettingsSchema.parse(details)).toMatchObject({ depositRateBasisPoints: 3000, discountRateBasisPoints: 550, isQuoteFree: false, preparationFeeHtCents: 2500, preparationFeeVatRateBasisPoints: 2000, travelFeeApplicable: false });
    expect(quoteFinancialSettingsSchema.safeParse({ ...details, depositRateBasisPoints: "101" }).success).toBe(false);
    expect(quoteFinancialSettingsSchema.safeParse({ ...details, workAddressId: "" }).success).toBe(false);
    expect(quoteFinancialSettingsSchema.safeParse({ ...details, preparationFeeHtCents: "" }).success).toBe(false);
  });

  it("accepts creating a brand new line or section, whose hidden id fields are absent from the form", () => {
    const lineFormData = new FormData();
    lineFormData.set("quoteId", "63000000-0000-4000-8000-000000000001");
    lineFormData.set("label", "Pose de robinet");
    lineFormData.set("unit", "forfait");
    lineFormData.set("lineKind", "labor");
    lineFormData.set("quantity", "1");
    expect(quoteLineSchema.safeParse(getQuoteLineValues(lineFormData)).success).toBe(true);

    const sectionFormData = new FormData();
    sectionFormData.set("quoteId", "63000000-0000-4000-8000-000000000001");
    sectionFormData.set("title", "Gros œuvre");
    expect(quoteSectionSchema.safeParse(getQuoteSectionValues(sectionFormData)).success).toBe(true);
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

  it("validates a short optional customer search", () => {
    expect(quoteSearchSchema.parse("  Martin  ")).toBe("Martin");
    expect(quoteSearchSchema.safeParse("a".repeat(101)).success).toBe(false);
  });

  it("filters quote lists without case sensitivity", () => {
    const quotes = [
      { customerName: "Martin Bâtiment", id: "1" },
      { customerName: "Durand plomberie", id: "2" },
    ];
    expect(filterQuotesByCustomerName(quotes, "BÂTI")).toEqual([quotes[0]]);
    expect(filterQuotesByCustomerName(quotes, "")).toEqual(quotes);
  });
});
