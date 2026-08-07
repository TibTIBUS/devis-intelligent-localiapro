export const QUANTITY_SCALE = 1_000n;
export const RATE_SCALE = 10_000n;

export type QuoteCalculationLine = {
  quantityMilliunits: bigint;
  unitPriceHtCents: bigint | null;
  vatRateBasisPoints: number | null;
};

export type VatBreakdown = {
  discountHtCents: bigint;
  grossHtCents: bigint;
  netHtCents: bigint;
  vatCents: bigint;
  vatRateBasisPoints: number;
};

export type CompleteQuoteTotals = {
  depositCents: bigint;
  discountHtCents: bigint;
  isComplete: true;
  subtotalHtCents: bigint;
  totalHtCents: bigint;
  totalTtcCents: bigint;
  totalVatCents: bigint;
  vatBreakdown: VatBreakdown[];
};

export type IncompleteQuoteTotals = {
  isComplete: false;
  missingLineIndexes: number[];
};

function assertRate(rateBasisPoints: number, field: string) {
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0 || rateBasisPoints > 10_000) {
    throw new RangeError(`${field} must be an integer between 0 and 10000.`);
  }
}

export function roundDivideHalfUp(numerator: bigint, denominator: bigint) {
  if (numerator < 0n || denominator <= 0n) {
    throw new RangeError("Financial rounding only accepts a non-negative amount and a positive divisor.");
  }

  return (numerator + denominator / 2n) / denominator;
}

export function calculateLine(quantityMilliunits: bigint, unitPriceHtCents: bigint | null) {
  if (quantityMilliunits <= 0n) {
    throw new RangeError("Quantity must be greater than zero.");
  }

  if (unitPriceHtCents === null) {
    return null;
  }

  if (unitPriceHtCents < 0n) {
    throw new RangeError("Unit price cannot be negative.");
  }

  return roundDivideHalfUp(quantityMilliunits * unitPriceHtCents, QUANTITY_SCALE);
}

export function calculateDiscount(amountHtCents: bigint, rateBasisPoints: number) {
  if (amountHtCents < 0n) {
    throw new RangeError("Discount base cannot be negative.");
  }

  assertRate(rateBasisPoints, "Discount rate");
  return roundDivideHalfUp(amountHtCents * BigInt(rateBasisPoints), RATE_SCALE);
}

export function calculateDeposit(totalTtcCents: bigint, rateBasisPoints: number) {
  if (totalTtcCents < 0n) {
    throw new RangeError("Deposit base cannot be negative.");
  }

  assertRate(rateBasisPoints, "Deposit rate");
  return roundDivideHalfUp(totalTtcCents * BigInt(rateBasisPoints), RATE_SCALE);
}

function allocateDiscountByVatRate(
  bases: Map<number, bigint>,
  discountHtCents: bigint,
  subtotalHtCents: bigint,
) {
  const allocations = [...bases.entries()].map(([vatRateBasisPoints, grossHtCents]) => {
    const numerator = discountHtCents * grossHtCents;
    return {
      allocated: subtotalHtCents === 0n ? 0n : numerator / subtotalHtCents,
      grossHtCents,
      remainder: subtotalHtCents === 0n ? 0n : numerator % subtotalHtCents,
      vatRateBasisPoints,
    };
  });

  let remaining = discountHtCents - allocations.reduce((sum, item) => sum + item.allocated, 0n);
  allocations.sort((left, right) => {
    if (left.remainder === right.remainder) {
      return left.vatRateBasisPoints - right.vatRateBasisPoints;
    }
    return left.remainder > right.remainder ? -1 : 1;
  });

  for (const allocation of allocations) {
    if (remaining === 0n) break;
    allocation.allocated += 1n;
    remaining -= 1n;
  }

  return allocations.sort((left, right) => left.vatRateBasisPoints - right.vatRateBasisPoints);
}

export function calculateQuoteTotals(
  lines: QuoteCalculationLine[],
  discountRateBasisPoints = 0,
  depositRateBasisPoints = 0,
): CompleteQuoteTotals | IncompleteQuoteTotals {
  assertRate(discountRateBasisPoints, "Discount rate");
  assertRate(depositRateBasisPoints, "Deposit rate");

  const missingLineIndexes = lines.flatMap((line, index) =>
    line.unitPriceHtCents === null || line.vatRateBasisPoints === null ? [index] : [],
  );

  if (missingLineIndexes.length > 0) {
    return { isComplete: false, missingLineIndexes };
  }

  const bases = new Map<number, bigint>();
  for (const line of lines) {
    const lineHtCents = calculateLine(line.quantityMilliunits, line.unitPriceHtCents);
    const vatRateBasisPoints = line.vatRateBasisPoints as number;
    assertRate(vatRateBasisPoints, "VAT rate");
    bases.set(vatRateBasisPoints, (bases.get(vatRateBasisPoints) ?? 0n) + (lineHtCents as bigint));
  }

  const subtotalHtCents = [...bases.values()].reduce((sum, amount) => sum + amount, 0n);
  const discountHtCents = calculateDiscount(subtotalHtCents, discountRateBasisPoints);
  const allocations = allocateDiscountByVatRate(bases, discountHtCents, subtotalHtCents);
  const vatBreakdown = allocations.map((allocation) => {
    const netHtCents = allocation.grossHtCents - allocation.allocated;
    return {
      discountHtCents: allocation.allocated,
      grossHtCents: allocation.grossHtCents,
      netHtCents,
      vatCents: roundDivideHalfUp(netHtCents * BigInt(allocation.vatRateBasisPoints), RATE_SCALE),
      vatRateBasisPoints: allocation.vatRateBasisPoints,
    };
  });
  const totalHtCents = subtotalHtCents - discountHtCents;
  const totalVatCents = vatBreakdown.reduce((sum, item) => sum + item.vatCents, 0n);
  const totalTtcCents = totalHtCents + totalVatCents;

  return {
    depositCents: calculateDeposit(totalTtcCents, depositRateBasisPoints),
    discountHtCents,
    isComplete: true,
    subtotalHtCents,
    totalHtCents,
    totalTtcCents,
    totalVatCents,
    vatBreakdown,
  };
}
