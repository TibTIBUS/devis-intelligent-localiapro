import { describe, expect, it } from "vitest";

import {
  calculateDeposit,
  calculateDiscount,
  calculateLine,
  calculateQuoteTotals,
  roundDivideHalfUp,
} from "@/lib/calculations/quotes";

describe("quote financial calculations", () => {
  it("rounds monetary results to the nearest cent with half rounded up", () => {
    expect(roundDivideHalfUp(1_004n, 1_000n)).toBe(1n);
    expect(roundDivideHalfUp(1_005n, 1_000n)).toBe(1n);
    expect(roundDivideHalfUp(1_500n, 1_000n)).toBe(2n);
  });

  it("calculates a line from an integer unit price and milliunits", () => {
    expect(calculateLine(2_500n, 5_590n)).toBe(13_975n);
  });

  it("does not calculate a line whose price is unknown", () => {
    expect(calculateLine(1_000n, null)).toBeNull();
  });

  it("calculates discounts and deposits with integer rates", () => {
    expect(calculateDiscount(10_005n, 1_000)).toBe(1_001n);
    expect(calculateDeposit(12_000n, 3_000)).toBe(3_600n);
  });

  it("groups VAT by rate after rounding each line", () => {
    const result = calculateQuoteTotals([
      { quantityMilliunits: 1_000n, unitPriceHtCents: 10_001n, vatRateBasisPoints: 2_000 },
      { quantityMilliunits: 500n, unitPriceHtCents: 10_001n, vatRateBasisPoints: 2_000 },
      { quantityMilliunits: 1_000n, unitPriceHtCents: 8_000n, vatRateBasisPoints: 1_000 },
    ]);

    expect(result).toMatchObject({
      isComplete: true,
      subtotalHtCents: 23_002n,
      totalHtCents: 23_002n,
      totalTtcCents: 26_802n,
      totalVatCents: 3_800n,
    });
  });

  it("allocates a global discount exactly across VAT rates", () => {
    const result = calculateQuoteTotals(
      [
        { quantityMilliunits: 1_000n, unitPriceHtCents: 10_001n, vatRateBasisPoints: 2_000 },
        { quantityMilliunits: 1_000n, unitPriceHtCents: 10_000n, vatRateBasisPoints: 1_000 },
      ],
      1_000,
      3_000,
    );

    expect(result.isComplete).toBe(true);
    if (!result.isComplete) return;
    expect(result.discountHtCents).toBe(2_000n);
    expect(result.vatBreakdown.reduce((sum, item) => sum + item.discountHtCents, 0n)).toBe(2_000n);
    expect(result.totalHtCents).toBe(18_001n);
    expect(result.totalVatCents).toBe(2_700n);
    expect(result.totalTtcCents).toBe(20_701n);
    expect(result.depositCents).toBe(6_210n);
  });

  it("covers a complete electrician field quote with targeted VAT and a 30 percent deposit", () => {
    const result = calculateQuoteTotals(
      [
        { quantityMilliunits: 8_000n, unitPriceHtCents: 8_500n, vatRateBasisPoints: 1_000 },
        { quantityMilliunits: 3_000n, unitPriceHtCents: 7_000n, vatRateBasisPoints: 2_000 },
        { quantityMilliunits: 1_000n, unitPriceHtCents: 42_000n, vatRateBasisPoints: 2_000 },
      ],
      0,
      3_000,
    );

    expect(result.isComplete).toBe(true);
    if (!result.isComplete) return;

    expect(result.subtotalHtCents).toBe(131_000n);
    expect(result.totalVatCents).toBe(19_400n);
    expect(result.totalTtcCents).toBe(150_400n);
    expect(result.depositCents).toBe(45_120n);
    expect(result.vatBreakdown).toEqual([
      {
        discountHtCents: 0n,
        grossHtCents: 68_000n,
        netHtCents: 68_000n,
        vatCents: 6_800n,
        vatRateBasisPoints: 1_000,
      },
      {
        discountHtCents: 0n,
        grossHtCents: 63_000n,
        netHtCents: 63_000n,
        vatCents: 12_600n,
        vatRateBasisPoints: 2_000,
      },
    ]);
  });

  it("marks totals incomplete when a price or VAT rate is missing", () => {
    expect(
      calculateQuoteTotals([
        { quantityMilliunits: 1_000n, unitPriceHtCents: null, vatRateBasisPoints: 2_000 },
        { quantityMilliunits: 1_000n, unitPriceHtCents: 1_000n, vatRateBasisPoints: null },
      ]),
    ).toEqual({ isComplete: false, missingLineIndexes: [0, 1] });
  });

  it("rejects invalid quantities, amounts and rates", () => {
    expect(() => calculateLine(0n, 1_000n)).toThrow(RangeError);
    expect(() => calculateLine(1_000n, -1n)).toThrow(RangeError);
    expect(() => calculateDiscount(1_000n, 10_001)).toThrow(RangeError);
    expect(() => calculateDeposit(-1n, 1_000)).toThrow(RangeError);
  });
});
