import "server-only";

import OpenAI from "openai";

import { parseOpenAIEnv, parseVoiceEnv } from "@/lib/validation/env";

const CLIENT_TIMEOUT_MS = 20_000;
const CLIENT_MAX_RETRIES = 1;

export function createOpenAIClient() {
  const env = parseOpenAIEnv(process.env);

  return {
    client: new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: CLIENT_MAX_RETRIES,
      timeout: CLIENT_TIMEOUT_MS,
    }),
    model: env.OPENAI_TEXT_MODEL,
  };
}

export function createVoiceOpenAIClient() {
  const env = parseVoiceEnv(process.env);

  return {
    client: new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: CLIENT_MAX_RETRIES,
      timeout: CLIENT_TIMEOUT_MS,
    }),
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL,
    ttsModel: env.OPENAI_TTS_MODEL,
    ttsVoice: env.OPENAI_TTS_VOICE,
  };
}
