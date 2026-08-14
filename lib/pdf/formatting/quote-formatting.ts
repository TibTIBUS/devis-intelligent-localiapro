const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
  useGrouping: false,
});

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

function groupThousands(integerPart: string) {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatEuroCents(cents: bigint) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integerPart = (absolute / 100n).toString();
  const decimalPart = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${groupThousands(integerPart)},${decimalPart} €`;
}

export function formatQuantity(milliunits: bigint) {
  return numberFormatter.format(Number(milliunits) / 1_000).replace(/[\u202f\u00a0]/g, " ");
}

export function formatPercentageBasisPoints(basisPoints: number) {
  return numberFormatter.format(basisPoints / 100).replace(/[\u202f\u00a0]/g, " ");
}

export function formatIsoDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}
