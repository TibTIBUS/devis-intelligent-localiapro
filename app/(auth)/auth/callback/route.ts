import { type NextRequest, NextResponse } from "next/server";

import { hasConsistentIdentityOwnership } from "@/lib/auth/identities";
import { getSafeAuthenticatedRedirect } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

function buildLoginErrorRedirect(request: NextRequest, errorCode: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/connexion";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("erreur", errorCode);
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeAuthenticatedRedirect(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(
      buildLoginErrorRedirect(request, "callback_invalide"),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      buildLoginErrorRedirect(request, "callback_invalide"),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !hasConsistentIdentityOwnership(user)) {
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.redirect(
      buildLoginErrorRedirect(request, "identite_invalide"),
    );
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}
