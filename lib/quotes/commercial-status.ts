export type CommercialQuoteStatus = "accepted" | "draft" | "expired" | "pending_acceptance";

export const commercialStatusLabel: Record<CommercialQuoteStatus, string> = {
  accepted: "Accepté",
  draft: "Brouillon",
  expired: "Expiré",
  pending_acceptance: "À accepter",
};

function currentParisDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export function getCommercialQuoteStatus({ accepted, status, validUntil }: { accepted: boolean; status: "draft" | "finalized"; validUntil: string | null }, today = currentParisDate()): CommercialQuoteStatus {
  if (status === "draft") return "draft";
  if (accepted) return "accepted";
  if (validUntil !== null && validUntil < today) return "expired";
  return "pending_acceptance";
}
