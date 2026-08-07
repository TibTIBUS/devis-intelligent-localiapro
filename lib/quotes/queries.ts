import type { SupabaseClient } from "@supabase/supabase-js";

import { calculateQuoteTotals, type QuoteCalculationLine } from "@/lib/calculations/quotes";

export type QuoteLine = {
  catalog_item_id: string | null;
  description: string | null;
  id: string;
  label: string;
  position: number;
  quantity_milliunits: number;
  section_id: string | null;
  unit: string;
  unit_price_ht_cents: number | null;
  vat_rate_basis_points: number | null;
};

export type QuoteSection = { id: string; position: number; title: string };
export type Quote = {
  customer_id: string;
  deposit_rate_basis_points: number;
  discount_rate_basis_points: number;
  id: string;
};

export type QuoteListItem = {
  customerName: string;
  id: string;
  totals: ReturnType<typeof calculateQuoteTotals>;
  updatedAt: string;
};

type QuoteListLineRow = {
  quantity_milliunits: number | string;
  quote_id: string;
  unit_price_ht_cents: number | string | null;
  vat_rate_basis_points: number | null;
};

function toBigInt(value: number | string) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Montant de devis non pris en charge.");
    return BigInt(value);
  }
  return BigInt(value);
}

export async function getQuoteEditorData(client: SupabaseClient, organizationId: string, quoteId: string) {
  const [quoteResult, sectionsResult, linesResult] = await Promise.all([
    client
      .from("quotes")
      .select("customer_id, deposit_rate_basis_points, discount_rate_basis_points, id")
      .eq("organization_id", organizationId)
      .eq("id", quoteId)
      .maybeSingle(),
    client
      .from("quote_sections")
      .select("id, position, title")
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
    client
      .from("quote_lines")
      .select("catalog_item_id, description, id, label, position, quantity_milliunits, section_id, unit, unit_price_ht_cents, vat_rate_basis_points")
      .eq("organization_id", organizationId)
      .eq("quote_id", quoteId)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (quoteResult.error || sectionsResult.error || linesResult.error) {
    throw new Error("Impossible de charger ce devis.");
  }

  if (!quoteResult.data) return null;

  const quote = quoteResult.data as Quote;
  const lines = linesResult.data as QuoteLine[];
  const calculationLines: QuoteCalculationLine[] = lines.map((line) => ({
    quantityMilliunits: toBigInt(line.quantity_milliunits),
    unitPriceHtCents:
      line.unit_price_ht_cents === null ? null : toBigInt(line.unit_price_ht_cents),
    vatRateBasisPoints: line.vat_rate_basis_points,
  }));

  return {
    lines,
    quote,
    sections: sectionsResult.data as QuoteSection[],
    totals: calculateQuoteTotals(
      calculationLines,
      quote.discount_rate_basis_points,
      quote.deposit_rate_basis_points,
    ),
  };
}

export function filterQuotesByCustomerName<T extends { customerName: string }>(quotes: T[], search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
  if (!normalizedSearch) return quotes;
  return quotes.filter((quote) => quote.customerName.toLocaleLowerCase("fr-FR").includes(normalizedSearch));
}

export async function getQuoteListData(client: SupabaseClient, organizationId: string, search: string) {
  const [quotesResult, customersResult, linesResult] = await Promise.all([
    client
      .from("quotes")
      .select("customer_id, deposit_rate_basis_points, discount_rate_basis_points, id, updated_at")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true }),
    client
      .from("customers")
      .select("display_name, id")
      .eq("organization_id", organizationId),
    client
      .from("quote_lines")
      .select("quantity_milliunits, quote_id, unit_price_ht_cents, vat_rate_basis_points")
      .eq("organization_id", organizationId),
  ]);

  if (quotesResult.error || customersResult.error || linesResult.error) {
    throw new Error("Impossible de charger les devis.");
  }

  const customersById = new Map(
    (customersResult.data as { display_name: string; id: string }[]).map((customer) => [customer.id, customer.display_name]),
  );
  const linesByQuoteId = new Map<string, QuoteCalculationLine[]>();
  for (const line of linesResult.data as QuoteListLineRow[]) {
    const lines = linesByQuoteId.get(line.quote_id) ?? [];
    lines.push({
      quantityMilliunits: toBigInt(line.quantity_milliunits),
      unitPriceHtCents: line.unit_price_ht_cents === null ? null : toBigInt(line.unit_price_ht_cents),
      vatRateBasisPoints: line.vat_rate_basis_points,
    });
    linesByQuoteId.set(line.quote_id, lines);
  }

  const quotes = (quotesResult.data as (Quote & { updated_at: string })[]).map((quote) => ({
    customerName: customersById.get(quote.customer_id) ?? "Client indisponible",
    id: quote.id,
    totals: calculateQuoteTotals(
      linesByQuoteId.get(quote.id) ?? [],
      quote.discount_rate_basis_points,
      quote.deposit_rate_basis_points,
    ),
    updatedAt: quote.updated_at,
  }));

  return filterQuotesByCustomerName(quotes, search);
}
