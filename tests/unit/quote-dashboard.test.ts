import { describe, expect, it } from "vitest";

import { buildQuoteDashboard } from "@/lib/dashboard/quote-dashboard";
import type { QuoteListItem } from "@/lib/quotes/queries";

const totals: QuoteListItem["totals"] = { depositCents: 0n, discountHtCents: 0n, isComplete: true, subtotalHtCents: 100n, totalHtCents: 100n, totalTtcCents: 120n, totalVatCents: 20n, vatBreakdown: [] };
const quote = (commercialStatus: QuoteListItem["commercialStatus"]): QuoteListItem => ({ commercialStatus, customerName: "Client", id: crypto.randomUUID(), issuedOn: null, quoteNumber: null, status: commercialStatus === "draft" ? "draft" : "finalized", totals, updatedAt: "2026-08-07T00:00:00.000Z" });

describe("quote dashboard", () => {
  it("aggregates counts and TTC by commercial status", () => {
    const dashboard = buildQuoteDashboard([quote("accepted"), quote("accepted"), quote("pending_acceptance"), quote("expired"), quote("draft")]);
    expect(dashboard.acceptedCount).toBe(2);
    expect(dashboard.acceptedTtcCents).toBe(240n);
    expect(dashboard.pendingAcceptanceCount).toBe(1);
    expect(dashboard.pendingAcceptanceTtcCents).toBe(120n);
    expect(dashboard.expiredCount).toBe(1);
    expect(dashboard.draftCount).toBe(1);
  });
});
