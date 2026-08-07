import { describe, expect, it } from "vitest";

import { getSafeAuthenticatedRedirect } from "@/lib/auth/redirects";

describe("getSafeAuthenticatedRedirect", () => {
  it("uses the dashboard when no return path is provided", () => {
    expect(getSafeAuthenticatedRedirect(null)).toBe("/tableau-de-bord");
  });

  it("keeps a valid internal return path", () => {
    expect(getSafeAuthenticatedRedirect("/devis/nouveau")).toBe("/devis/nouveau");
  });

  it("supports a route-specific safe fallback", () => {
    expect(getSafeAuthenticatedRedirect(null, "/mot-de-passe/nouveau")).toBe(
      "/mot-de-passe/nouveau",
    );
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(getSafeAuthenticatedRedirect("https://evil.example")).toBe(
      "/tableau-de-bord",
    );
    expect(getSafeAuthenticatedRedirect("//evil.example")).toBe(
      "/tableau-de-bord",
    );
    expect(getSafeAuthenticatedRedirect("/\\\\evil.example")).toBe(
      "/tableau-de-bord",
    );
  });
});
