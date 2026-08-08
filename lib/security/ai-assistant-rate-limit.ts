import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type AiAssistantQuotaResult = "allowed" | "limited" | "unavailable";

export async function consumeAiAssistantRequestQuota(userId: string): Promise<AiAssistantQuotaResult> {
  const { data, error } = await createAdminClient().rpc("consume_ai_assistant_request_quota", {
    p_actor_user_id: userId,
  });

  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "limited";
}
