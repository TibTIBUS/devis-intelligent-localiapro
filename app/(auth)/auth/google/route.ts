import { NextResponse } from "next/server";

import { getTrustedSupabaseOAuthUrl } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";
import { parsePublicEnv } from "@/lib/validation/env";

export async function GET() {
  const env = parsePublicEnv(process.env);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        prompt: "select_account",
      },
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  const authorizationUrl = error
    ? null
    : getTrustedSupabaseOAuthUrl(data.url, env.NEXT_PUBLIC_SUPABASE_URL);

  if (!authorizationUrl) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/connexion?erreur=oauth_indisponible`);
  }

  return NextResponse.redirect(authorizationUrl);
}
