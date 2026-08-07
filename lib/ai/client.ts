import "server-only";

import OpenAI from "openai";

import { parseOpenAIEnv } from "@/lib/validation/env";

export function createOpenAIClient() {
  const env = parseOpenAIEnv(process.env);

  return {
    client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    model: env.OPENAI_TEXT_MODEL,
  };
}
