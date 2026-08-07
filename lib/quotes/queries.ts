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
