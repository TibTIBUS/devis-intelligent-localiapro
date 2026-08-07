import { describe, expect, it } from "vitest";

import { quoteAcceptanceSchema } from "@/lib/validation/quote-acceptance";

const validAcceptance = {
  acceptedOn: "2026-08-07",
  evidenceReference: "devis-signe.pdf",
  evidenceType: "signed_quote",
  quoteId: "10000000-0000-4000-8000-000000000001",
  quoteVersionId: "10000000-0000-4000-8000-000000000002",
  signatoryName: "Jean Dupont",
};

describe("quote acceptance validation", () => {
  it("accepts a documented signed quote", () => {
    expect(quoteAcceptanceSchema.safeParse(validAcceptance).success).toBe(true);
  });

  it("rejects a future acceptance date", () => {
    expect(quoteAcceptanceSchema.safeParse({ ...validAcceptance, acceptedOn: "2099-01-01" }).success).toBe(false);
  });

  it("requires an identified signatory", () => {
    expect(quoteAcceptanceSchema.safeParse({ ...validAcceptance, signatoryName: " " }).success).toBe(false);
  });
});
