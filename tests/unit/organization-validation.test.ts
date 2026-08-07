import { describe, expect, it } from "vitest";

import {
  getInitialOrganizationValues,
  initialOrganizationSchema,
} from "@/lib/validation/organization";

describe("initialOrganizationSchema", () => {
  it("accepts the minimal company information", () => {
    expect(
      initialOrganizationSchema.safeParse({
        name: "Entreprise Martin",
        trade: "Plomberie",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing or blank company name", () => {
    expect(initialOrganizationSchema.safeParse({ name: "" }).success).toBe(false);
    expect(initialOrganizationSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("normalizes optional blank trade input", () => {
    const formData = new FormData();
    formData.set("name", "Entreprise Martin");
    formData.set("trade", "");

    expect(getInitialOrganizationValues(formData)).toEqual({
      name: "Entreprise Martin",
      trade: undefined,
    });
  });
});
