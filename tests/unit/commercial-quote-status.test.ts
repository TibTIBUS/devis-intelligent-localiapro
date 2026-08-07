import { describe, expect, it } from "vitest";

import { getCommercialQuoteStatus } from "@/lib/quotes/commercial-status";

describe("commercial quote status", () => {
  it("keeps drafts as drafts", () => {
    expect(getCommercialQuoteStatus({ accepted: false, status: "draft", validUntil: null }, "2026-08-07")).toBe("draft");
  });

  it("marks a finalized accepted quote as accepted", () => {
    expect(getCommercialQuoteStatus({ accepted: true, status: "finalized", validUntil: "2026-08-01" }, "2026-08-07")).toBe("accepted");
  });

  it("marks a non-accepted quote after its validity date as expired", () => {
    expect(getCommercialQuoteStatus({ accepted: false, status: "finalized", validUntil: "2026-08-06" }, "2026-08-07")).toBe("expired");
  });

  it("keeps a non-accepted quote on its validity date pending", () => {
    expect(getCommercialQuoteStatus({ accepted: false, status: "finalized", validUntil: "2026-08-07" }, "2026-08-07")).toBe("pending_acceptance");
  });
});
