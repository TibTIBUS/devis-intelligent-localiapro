const euroFormatter = new Intl.NumberFormat("fr-FR", {
  currency: "EUR",
  minimumFractionDigits: 2,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatEuroCents(cents: bigint) {
  return euroFormatter.format(Number(cents) / 100);
}

export function formatQuantity(milliunits: bigint) {
  return numberFormatter.format(Number(milliunits) / 1_000);
}

export function formatPercentageBasisPoints(basisPoints: number) {
  return numberFormatter.format(basisPoints / 100);
}

export function formatIsoDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}
