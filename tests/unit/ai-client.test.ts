import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it } from "vitest";

import { isOpenAITimeoutError } from "@/lib/ai/errors";
import {
  MAX_OPENAI_OUTPUT_TOKENS,
  OPENAI_MAX_RETRIES,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "@/lib/ai/limits";

describe("OpenAI assistant limits", () => {
  it("uses bounded retries, timeout, and output", () => {
    expect(OPENAI_MAX_RETRIES).toBe(1);
    expect(OPENAI_REQUEST_TIMEOUT_MS).toBe(20_000);
    expect(MAX_OPENAI_OUTPUT_TOKENS).toBe(800);
  });

  it("recognizes OpenAI connection timeouts", () => {
    expect(isOpenAITimeoutError(new APIConnectionTimeoutError())).toBe(true);
    expect(isOpenAITimeoutError(new Error("timeout"))).toBe(false);
  });
});
