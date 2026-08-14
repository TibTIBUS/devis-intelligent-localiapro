import "server-only";

import OpenAI from "openai";

import {
  OPENAI_MAX_RETRIES,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "@/lib/ai/limits";
import { parseOpenAIEnv } from "@/lib/validation/env";

export function createOpenAIClient() {
  const env = parseOpenAIEnv(process.env);

  return {
    client: new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: OPENAI_MAX_RETRIES,
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    }),
    model: env.OPENAI_TEXT_MODEL,
  };
}
