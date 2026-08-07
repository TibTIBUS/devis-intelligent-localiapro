const defaultAuthenticatedPath = "/tableau-de-bord";

export function getSafeAuthenticatedRedirect(
  next: string | null,
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\\\")
  ) {
    return defaultAuthenticatedPath;
  }

  return next;
}
