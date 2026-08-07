import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCurrentOrganizationId(client: SupabaseClient) {
  const { data, error } = await client
    .from("organization_members")
    .select("organization_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Impossible de charger l’entreprise courante.");
  }

  return data?.organization_id ?? null;
}
