import OpenAI from "openai";

export function isOpenAITimeoutError(error: unknown) {
  return error instanceof OpenAI.APIConnectionTimeoutError;
}
