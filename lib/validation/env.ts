import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const supabaseAdminEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  APP_ENV: z.enum(["local", "preview", "production"]),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_TEXT_MODEL: z.string().min(1),
});

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_TEXT_MODEL: z.string().min(1),
});

const voiceEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_TRANSCRIPTION_MODEL: z.string().min(1),
  OPENAI_TTS_MODEL: z.string().min(1),
  OPENAI_TTS_VOICE: z.string().min(1),
});

const resendEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.email(),
});

const stripeEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().min(1),
  STRIPE_PRICE_ANNUAL: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type OpenAIEnv = z.infer<typeof openAIEnvSchema>;
export type VoiceEnv = z.infer<typeof voiceEnvSchema>;
export type ResendEnv = z.infer<typeof resendEnvSchema>;
export type StripeEnv = z.infer<typeof stripeEnvSchema>;

type Environment = Record<string, string | undefined>;

export function parsePublicEnv(env: Environment): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function parseSupabaseAdminEnv(env: Environment): SupabaseAdminEnv {
  return supabaseAdminEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

export function parseServerEnv(env: Environment): ServerEnv {
  return serverEnvSchema.parse({
    ...parsePublicEnv(env),
    APP_ENV: env.APP_ENV,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: env.OPENAI_TEXT_MODEL,
  });
}

export function parseOpenAIEnv(env: Environment): OpenAIEnv {
  return openAIEnvSchema.parse({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: env.OPENAI_TEXT_MODEL,
  });
}

export function parseVoiceEnv(env: Environment): VoiceEnv {
  return voiceEnvSchema.parse({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TRANSCRIPTION_MODEL: env.OPENAI_TRANSCRIPTION_MODEL,
    OPENAI_TTS_MODEL: env.OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE: env.OPENAI_TTS_VOICE,
  });
}

export function parseResendEnv(env: Environment): ResendEnv {
  return resendEnvSchema.parse({
    RESEND_API_KEY: env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: env.RESEND_FROM_EMAIL,
  });
}

export function parseStripeEnv(env: Environment): StripeEnv {
  return stripeEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_MONTHLY: env.STRIPE_PRICE_MONTHLY,
    STRIPE_PRICE_ANNUAL: env.STRIPE_PRICE_ANNUAL,
  });
}
