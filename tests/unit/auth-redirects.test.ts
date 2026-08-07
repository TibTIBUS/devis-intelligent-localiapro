import { describe, expect, it } from "vitest";

import {
  getSafeAuthenticatedRedirect,
  getTrustedSupabaseOAuthUrl,
} from "@/lib/auth/redirects";

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

describe("getTrustedSupabaseOAuthUrl", () => {
  const supabaseUrl = "https://project-ref.supabase.co";

  it("accepts the Supabase OAuth authorization endpoint", () => {
    expect(
      getTrustedSupabaseOAuthUrl(
        `${supabaseUrl}/auth/v1/authorize?provider=google`,
        supabaseUrl,
      ),
    ).toBe(`${supabaseUrl}/auth/v1/authorize?provider=google`);
  });

  it("rejects an external, malformed, or unexpected endpoint", () => {
    expect(
      getTrustedSupabaseOAuthUrl(
        "https://evil.example/auth/v1/authorize",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      getTrustedSupabaseOAuthUrl(`${supabaseUrl}/auth/v1/token`, supabaseUrl),
    ).toBeNull();
    expect(getTrustedSupabaseOAuthUrl("not-a-url", supabaseUrl)).toBeNull();
  });
});
