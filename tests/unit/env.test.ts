import { describe, expect, it } from "vitest";

import { parseOpenAIEnv, parsePublicEnv, parseServerEnv } from "@/lib/validation/env";

const validEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  APP_ENV: "local",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  OPENAI_API_KEY: "openai-test",
  OPENAI_TEXT_MODEL: "text-model-test",
  OPENAI_REALTIME_MODEL: "realtime-model-test",
} satisfies Record<string, string | undefined>;

describe("environment validation", () => {
  it("accepts the documented public variables", () => {
    expect(parsePublicEnv(validEnv)).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    });
  });

  it("rejects a missing public Supabase key", () => {
    expect(() =>
      parsePublicEnv({
        ...validEnv,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      }),
    ).toThrow();
  });

  it("keeps server secrets mandatory and server-only", () => {
    expect(parseServerEnv(validEnv).SUPABASE_SERVICE_ROLE_KEY).toBe(
      "service-role-test",
    );
  });

  it("can validate the OpenAI server configuration independently", () => {
    expect(parseOpenAIEnv(validEnv)).toEqual({
      OPENAI_API_KEY: "openai-test",
      OPENAI_TEXT_MODEL: "text-model-test",
    });
    expect(() => parseOpenAIEnv({ OPENAI_API_KEY: "openai-test" })).toThrow();
  });
});
