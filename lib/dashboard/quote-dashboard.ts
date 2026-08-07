import type { QuoteListItem } from "@/lib/quotes/queries";

export type QuoteDashboard = {
  acceptedCount: number;
  acceptedTtcCents: bigint;
  draftCount: number;
  expiredCount: number;
  pendingAcceptanceCount: number;
  pendingAcceptanceTtcCents: bigint;
  recentQuotes: QuoteListItem[];
};

function completeTotal(quote: QuoteListItem) {
  return quote.totals.isComplete ? quote.totals.totalTtcCents : 0n;
}

export function buildQuoteDashboard(quotes: QuoteListItem[]): QuoteDashboard {
  return quotes.reduce<QuoteDashboard>((dashboard, quote) => {
    if (quote.commercialStatus === "accepted") {
      dashboard.acceptedCount += 1;
      dashboard.acceptedTtcCents += completeTotal(quote);
    }
    if (quote.commercialStatus === "draft") dashboard.draftCount += 1;
    if (quote.commercialStatus === "expired") dashboard.expiredCount += 1;
    if (quote.commercialStatus === "pending_acceptance") {
      dashboard.pendingAcceptanceCount += 1;
      dashboard.pendingAcceptanceTtcCents += completeTotal(quote);
    }
    return dashboard;
  }, {
    acceptedCount: 0,
    acceptedTtcCents: 0n,
    draftCount: 0,
    expiredCount: 0,
    pendingAcceptanceCount: 0,
    pendingAcceptanceTtcCents: 0n,
    recentQuotes: quotes.slice(0, 5),
  });
}
