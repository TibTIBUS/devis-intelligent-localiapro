import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { parsePublicEnv } from "@/lib/validation/env";

export async function createClient() {
  const cookieStore = await cookies();
  const env = parsePublicEnv(process.env);

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Les Server Components ne peuvent pas écrire les cookies.
            // Le proxy d'authentification prendra en charge leur actualisation.
          }
        },
      },
    },
  );
}
