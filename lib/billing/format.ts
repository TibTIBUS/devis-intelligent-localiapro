export function formatEuroAmount(cents: number | null | undefined) {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(cents / 100);
}
