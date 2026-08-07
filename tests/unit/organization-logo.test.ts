import { describe, expect, it } from "vitest";

import {
  detectLogoMimeType,
  getOrganizationLogoPath,
  validateOrganizationLogo,
} from "@/lib/storage/organization-logo";

describe("organization logo", () => {
  it("builds a stable organization-scoped path", () => {
    expect(
      getOrganizationLogoPath("41000000-0000-0000-0000-000000000001"),
    ).toBe(
      "organizations/41000000-0000-0000-0000-000000000001/logo/logo",
    );
  });

  it("detects the supported image signatures", () => {
    expect(detectLogoMimeType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(
      "image/jpeg",
    );
    expect(
      detectLogoMimeType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      detectLogoMimeType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("rejects a file whose declared type does not match its content", async () => {
    const fakePng = new File([new Uint8Array([0xff, 0xd8, 0xff])], "logo.png", {
      type: "image/png",
    });

    await expect(validateOrganizationLogo(fakePng)).resolves.toMatchObject({
      success: false,
    });
  });

  it("accepts a valid PNG file", async () => {
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      "logo.png",
      { type: "image/png" },
    );

    await expect(validateOrganizationLogo(png)).resolves.toMatchObject({
      data: { contentType: "image/png" },
      success: true,
    });
  });
});
