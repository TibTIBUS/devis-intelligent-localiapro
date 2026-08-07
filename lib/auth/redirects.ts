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
