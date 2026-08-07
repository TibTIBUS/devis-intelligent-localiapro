import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeAuthenticatedRedirect } from "@/lib/auth/redirects";
import { parsePublicEnv } from "@/lib/validation/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeAuthenticatedRedirect(
    request.nextUrl.searchParams.get("next"),
  );
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next;
  redirectUrl.search = "";

  if (!code) {
    redirectUrl.pathname = "/connexion";
    redirectUrl.searchParams.set("erreur", "callback_invalide");
    return NextResponse.redirect(redirectUrl);
  }

  const env = parsePublicEnv(process.env);
  let response = NextResponse.redirect(redirectUrl);
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirectUrl.pathname = "/connexion";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("erreur", "callback_invalide");
    response = NextResponse.redirect(redirectUrl);
  }

  return response;
}
