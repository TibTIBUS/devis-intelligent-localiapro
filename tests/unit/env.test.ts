import { describe, expect, it } from "vitest";

import {
  parseOpenAIEnv,
  parsePublicEnv,
  parseSupabaseAdminEnv,
} from "@/lib/validation/env";

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

  it("validates the minimum configuration required by the Supabase admin client", () => {
    expect(
      parseSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: validEnv.SUPABASE_SERVICE_ROLE_KEY,
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: validEnv.SUPABASE_SERVICE_ROLE_KEY,
    });
  });

  it("rejects a missing Supabase service role key", () => {
    expect(() =>
      parseSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: validEnv.NEXT_PUBLIC_SUPABASE_URL,
      }),
    ).toThrow();
  });

  it("can validate the OpenAI server configuration independently", () => {
    expect(parseOpenAIEnv(validEnv)).toEqual({
      OPENAI_API_KEY: "openai-test",
      OPENAI_TEXT_MODEL: "text-model-test",
    });
    expect(() => parseOpenAIEnv({ OPENAI_API_KEY: "openai-test" })).toThrow();
  });
});
