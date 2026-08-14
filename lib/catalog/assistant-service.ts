import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogItem } from "@/lib/catalog/queries";

const SEARCH_STOP_WORDS = new Set([
  "a",
  "au",
  "aux",
  "avec",
  "de",
  "des",
  "du",
  "et",
  "la",
  "le",
  "les",
  "pour",
  "sur",
  "un",
  "une",
]);

function normalizeCatalogSearchToken(token: string) {
  const normalized = token
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .trim();

  if (normalized.length > 3 && normalized.endsWith("s")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function buildCatalogSearchTokens(query: string) {
  return [...new Set(
    query
      .split(/\s+/)
      .map(normalizeCatalogSearchToken)
      .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token)),
  )].slice(0, 5);
}

function normalizeCatalogSearchText(value: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, " ");
}

export async function searchCatalogForAssistant(
  client: SupabaseClient,
  organizationId: string,
  query: string,
) {
  const tokens = buildCatalogSearchTokens(query);
  if (tokens.length === 0) return [];

  const escapedPrimaryToken = tokens[0].replaceAll("%", "\\%").replaceAll("_", "\\_");
  const { data, error } = await client
    .from("catalog_items")
    .select("category_id, description, id, name, unit, unit_price_ht_cents")
    .eq("organization_id", organizationId)
    .or(`name.ilike.%${escapedPrimaryToken}%,description.ilike.%${escapedPrimaryToken}%`)
    .order("name", { ascending: true })
    .limit(24);

  if (error) throw new Error("Impossible de rechercher le catalogue.");

  const ranked = (data as CatalogItem[])
    .map((item) => {
      const searchableText = `${normalizeCatalogSearchText(item.name)} ${normalizeCatalogSearchText(item.description)}`;
      const score = tokens.reduce(
        (total, token) => total + (searchableText.includes(token) ? 1 : 0),
        0,
      );
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name, "fr"))
    .slice(0, 8)
    .map(({ item }) => item);

  return ranked;
}

export async function getCatalogItemForAssistant(
  client: SupabaseClient,
  organizationId: string,
  catalogItemId: string,
) {
  const { data, error } = await client
    .from("catalog_items")
    .select("category_id, description, id, name, unit, unit_price_ht_cents")
    .eq("organization_id", organizationId)
    .eq("id", catalogItemId)
    .maybeSingle();

  if (error) throw new Error("Impossible de charger cette prestation du catalogue.");
  return data as CatalogItem | null;
}
