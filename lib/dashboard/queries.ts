import type { SupabaseClient } from "@supabase/supabase-js";

import { buildQuoteDashboard } from "@/lib/dashboard/quote-dashboard";
import { getQuoteListData } from "@/lib/quotes/queries";

export async function getQuoteDashboard(client: SupabaseClient, organizationId: string) {
  return buildQuoteDashboard(await getQuoteListData(client, organizationId, ""));
}
