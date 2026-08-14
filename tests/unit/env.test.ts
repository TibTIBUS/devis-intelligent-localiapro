import { describe, expect, it } from "vitest";

import {
  parseOpenAIEnv,
  parsePublicEnv,
  parseResendEnv,
  parseServerEnv,
  parseSupabaseAdminEnv,
  parseVoiceEnv,
} from "@/lib/validation/env";

const validEnv = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  APP_ENV: "local",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  OPENAI_API_KEY: "openai-test",
  OPENAI_TEXT_MODEL: "text-model-test",
  OPENAI_TRANSCRIPTION_MODEL: "transcription-model-test",
  OPENAI_TTS_MODEL: "tts-model-test",
  OPENAI_TTS_VOICE: "alloy",
  RESEND_API_KEY: "resend-test",
  RESEND_FROM_EMAIL: "devis@example.com",
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

  it("validates the Supabase admin client independently of unrelated server variables", () => {
    expect(parseSupabaseAdminEnv(validEnv)).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
    });
    expect(() =>
      parseSupabaseAdminEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      }),
    ).not.toThrow();
  });

  it("can validate the voice configuration independently", () => {
    expect(parseVoiceEnv(validEnv)).toEqual({
      OPENAI_API_KEY: "openai-test",
      OPENAI_TRANSCRIPTION_MODEL: "transcription-model-test",
      OPENAI_TTS_MODEL: "tts-model-test",
      OPENAI_TTS_VOICE: "alloy",
    });
    expect(() => parseVoiceEnv({ OPENAI_API_KEY: "openai-test" })).toThrow();
  });

  it("can validate the Resend configuration independently", () => {
    expect(parseResendEnv(validEnv)).toEqual({
      RESEND_API_KEY: "resend-test",
      RESEND_FROM_EMAIL: "devis@example.com",
    });
    expect(() => parseResendEnv({ RESEND_API_KEY: "resend-test" })).toThrow();
  });
});
