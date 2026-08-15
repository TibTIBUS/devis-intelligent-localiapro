import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("security response headers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("applies the MVP security baseline to every route", async () => {
    const { default: nextConfig } = await import("../../next.config");
    const rules = await nextConfig.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.source).toBe("/:path*");

    const headers = Object.fromEntries(
      rules?.[0]?.headers.map((header) => [header.key, header.value]) ?? [],
    );

    expect(headers).toMatchObject({
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' blob: https://example.supabase.co; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=(self), payment=(), usb=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
  });
});
