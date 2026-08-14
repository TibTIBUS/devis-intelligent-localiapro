import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("security response headers", () => {
  it("applies the MVP security baseline to every route", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toHaveLength(1);
    expect(rules?.[0]?.source).toBe("/:path*");

    const headers = Object.fromEntries(
      rules?.[0]?.headers.map((header) => [header.key, header.value]) ?? [],
    );

    expect(headers).toMatchObject({
      "Content-Security-Policy": "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
  });
});
