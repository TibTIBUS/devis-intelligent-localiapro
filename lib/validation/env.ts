import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  APP_ENV: z.enum(["local", "preview", "production"]),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_TEXT_MODEL: z.string().min(1),
  OPENAI_REALTIME_MODEL: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

type Environment = Record<string, string | undefined>;

export function parsePublicEnv(env: Environment): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function parseServerEnv(env: Environment): ServerEnv {
  return serverEnvSchema.parse({
    ...parsePublicEnv(env),
    APP_ENV: env.APP_ENV,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_TEXT_MODEL: env.OPENAI_TEXT_MODEL,
    OPENAI_REALTIME_MODEL: env.OPENAI_REALTIME_MODEL,
  });
}
