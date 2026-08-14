import { describe, expect, it } from "vitest";

import {
  catalogCategorySchema,
  catalogItemSchema,
  formatUnitPrice,
  getCatalogCategoryValues,
  getCatalogItemValues,
} from "@/lib/validation/catalog";

describe("catalog validation", () => {
  it("accepts a category with an optional blank description", () => {
    expect(
      catalogCategorySchema.safeParse({ categoryId: "", description: "", name: "Plomberie" })
        .success,
    ).toBe(true);
  });

  it("accepts creating a brand new category, whose hidden id field is absent from the form", () => {
    const formData = new FormData();
    formData.set("name", "Plomberie");
    formData.set("description", "");

    expect(catalogCategorySchema.safeParse(getCatalogCategoryValues(formData)).success).toBe(true);
  });

  it("accepts creating a brand new item, whose hidden id field is absent from the form", () => {
    const formData = new FormData();
    formData.set("name", "Pose de robinet");
    formData.set("unit", "forfait");
    formData.set("categoryId", "");
    formData.set("unitPriceHt", "");
    formData.set("description", "");

    expect(catalogItemSchema.safeParse(getCatalogItemValues(formData)).success).toBe(true);
  });

  it("normalizes a decimal price to cents", () => {
    expect(
      catalogItemSchema.parse({
        categoryId: "",
        description: "",
        itemId: "",
        name: "Main-d’œuvre plomberie",
        unit: "heure",
        unitPriceHtCents: "55,90",
      }).unitPriceHtCents,
    ).toBe(5590);
  });

  it("accepts an unknown price and rejects more than two decimals", () => {
    expect(
      catalogItemSchema.safeParse({
        categoryId: "",
        description: "",
        itemId: "",
        name: "Déplacement",
        unit: "forfait",
        unitPriceHtCents: "",
      }).success,
    ).toBe(true);
    expect(
      catalogItemSchema.safeParse({
        categoryId: "",
        description: "",
        itemId: "",
        name: "Déplacement",
        unit: "forfait",
        unitPriceHtCents: "12,345",
      }).success,
    ).toBe(false);
  });

  it("collects item form values and formats price for display", () => {
    const formData = new FormData();
    formData.set("itemId", "13000000-0000-0000-0000-000000000001");
    formData.set("unitPriceHt", "42,00");

    expect(getCatalogItemValues(formData)).toMatchObject({
      itemId: "13000000-0000-0000-0000-000000000001",
      unitPriceHtCents: "42,00",
    });
    expect(formatUnitPrice(4200)).toBe("42,00");
    expect(formatUnitPrice(null)).toBe("");
  });
});
