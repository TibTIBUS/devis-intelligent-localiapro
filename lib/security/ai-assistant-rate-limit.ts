import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type AiAssistantQuotaResult = "allowed" | "limited" | "unavailable";

export type AiRequestQuotaBucket =
  | "assistant"
  | "voice_transcribe"
  | "voice_speak"
  | "quote_email";

const QUOTA_LIMITS_PER_MINUTE: Record<AiRequestQuotaBucket, number> = {
  assistant: 10,
  voice_transcribe: 20,
  voice_speak: 20,
  quote_email: 5,
};

export async function consumeAiRequestQuota(
  userId: string,
  bucket: AiRequestQuotaBucket,
): Promise<AiAssistantQuotaResult> {
  const { data, error } = await createAdminClient().rpc("consume_ai_assistant_request_quota", {
    p_actor_user_id: userId,
    p_bucket: bucket,
    p_limit: QUOTA_LIMITS_PER_MINUTE[bucket],
  });

  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "limited";
}

export async function consumeAiAssistantRequestQuota(userId: string): Promise<AiAssistantQuotaResult> {
  return consumeAiRequestQuota(userId, "assistant");
}
