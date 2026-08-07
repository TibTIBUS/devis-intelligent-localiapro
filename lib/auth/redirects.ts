const defaultAuthenticatedPath = "/tableau-de-bord";

export function getSafeAuthenticatedRedirect(
  next: string | null,
  fallback = defaultAuthenticatedPath,
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\\\")
  ) {
    return fallback;
  }

  return next;
}

export function getTrustedSupabaseOAuthUrl(
  candidate: string,
  supabaseUrl: string,
): string | null {
  try {
    const authorizationUrl = new URL(candidate);
    const projectUrl = new URL(supabaseUrl);

    if (
      authorizationUrl.origin !== projectUrl.origin ||
      authorizationUrl.pathname !== "/auth/v1/authorize"
    ) {
      return null;
    }

    return authorizationUrl.toString();
  } catch {
    return null;
  }
}
