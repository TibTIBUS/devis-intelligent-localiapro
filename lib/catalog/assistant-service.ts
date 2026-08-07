import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogItem } from "@/lib/catalog/queries";

export async function searchCatalogForAssistant(
  client: SupabaseClient,
  organizationId: string,
  query: string,
) {
  const escapedQuery = query.replaceAll("%", "\\%").replaceAll("_", "\\_");
  const { data, error } = await client
    .from("catalog_items")
    .select("category_id, description, id, name, unit, unit_price_ht_cents")
    .eq("organization_id", organizationId)
    .ilike("name", `%${escapedQuery}%`)
    .order("name", { ascending: true })
    .limit(8);

  if (error) throw new Error("Impossible de rechercher le catalogue.");

  return data as CatalogItem[];
}
