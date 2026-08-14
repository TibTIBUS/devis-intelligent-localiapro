import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type FinalizeQuoteResult =
  | { quoteId: string; quoteNumber: string; quoteVersionId: string; success: true }
  | { success: false };

export async function finalizeQuoteForOrganization(
  organizationId: string,
  quoteId: string,
  userId: string,
): Promise<FinalizeQuoteResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("finalize_quote", {
    p_actor_user_id: userId,
    p_organization_id: organizationId,
    p_quote_id: quoteId,
  });
  if (error || !data?.[0]) return { success: false };

  return {
    quoteId: data[0].quote_id,
    quoteNumber: data[0].quote_number,
    quoteVersionId: data[0].quote_version_id,
    success: true,
  };
}
