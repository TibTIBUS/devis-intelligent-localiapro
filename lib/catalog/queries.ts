import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogCategory = {
  description: string | null;
  id: string;
  name: string;
};

export type CatalogItem = {
  category_id: string | null;
  description: string | null;
  id: string;
  name: string;
  unit: string;
  unit_price_ht_cents: number | null;
};

export async function getCatalogCategories(
  client: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await client
    .from("catalog_categories")
    .select("description, id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Impossible de charger les catégories du catalogue.");
  }

  return data as CatalogCategory[];
}

export async function getCatalogItems(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("catalog_items")
    .select("category_id, description, id, name, unit, unit_price_ht_cents")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Impossible de charger les prestations du catalogue.");
  }

  return data as CatalogItem[];
}
