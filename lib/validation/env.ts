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

const openAIEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_TEXT_MODEL: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type SupabaseAdminEnv = z.infer<typeof supabaseAdminEnvSchema>;
export type OpenAIEnv = z.infer<typeof openAIEnvSchema>;

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

export function parseOpenAIEnv(env: Environment): OpenAIEnv {
  return openAIEnvSchema.parse({
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: env.OPENAI_TEXT_MODEL,
  });
}
