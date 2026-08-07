import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeAuthenticatedRedirect } from "@/lib/auth/redirects";
import { parsePublicEnv } from "@/lib/validation/env";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = getSafeAuthenticatedRedirect(
    request.nextUrl.searchParams.get("next"),
    "/mot-de-passe/nouveau",
  );
  redirectUrl.search = "";

  if (!tokenHash || type !== "recovery") {
    redirectUrl.pathname = "/mot-de-passe-oublie";
    redirectUrl.searchParams.set("erreur", "lien_invalide");
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    redirectUrl.pathname = "/mot-de-passe-oublie";
    redirectUrl.searchParams.set("erreur", "lien_invalide");
    response = NextResponse.redirect(redirectUrl);
  }

  return response;
}
