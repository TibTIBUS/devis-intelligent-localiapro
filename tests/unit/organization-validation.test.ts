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

  it("accepts creating a new organization, whose acquisitionSource field may be absent from the form", () => {
    const formData = new FormData();
    formData.set("name", "Entreprise Martin");
    formData.set("trade", "Plomberie");

    expect(initialOrganizationSchema.safeParse(getInitialOrganizationValues(formData)).success).toBe(true);
  });

  it("rejects a missing or blank company name", () => {
    expect(initialOrganizationSchema.safeParse({ name: "" }).success).toBe(false);
    expect(initialOrganizationSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("collects raw form values without transforming them", () => {
    const formData = new FormData();
    formData.set("name", "Entreprise Martin");
    formData.set("trade", "");

    expect(getInitialOrganizationValues(formData)).toEqual({
      acquisitionSource: null,
      name: "Entreprise Martin",
      trade: "",
    });
  });

  it("requires the trade field to be non-blank", () => {
    expect(
      initialOrganizationSchema.safeParse({ name: "Entreprise Martin", trade: "" }).success,
    ).toBe(false);
  });
});
