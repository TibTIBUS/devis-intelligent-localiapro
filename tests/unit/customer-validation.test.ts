import { describe, expect, it } from "vitest";

import { customerAddressSchema, customerContactSchema, customerSchema, getCustomerAddressValues, getCustomerContactValues } from "@/lib/validation/customer";

describe("customer validation", () => {
  it("accepts a neutral customer identity", () => {
    expect(customerSchema.safeParse({ customerId: "", displayName: "Martin Dupont" }).success).toBe(true);
  });

  it("requires contact information and validates an optional email", () => {
    const values = { contactId: "", customerId: "13000000-0000-4000-8000-000000000001", email: "", isPrimary: false, name: "", phone: "" };
    expect(customerContactSchema.safeParse(values).success).toBe(false);
    expect(customerContactSchema.safeParse({ ...values, email: "contact@example.com" }).success).toBe(true);
  });

  it("normalizes the country code and rejects an invalid one", () => {
    const values = { addressId: "", addressLine1: "12 rue des Lilas", addressLine2: "", city: "Lyon", countryCode: "fr", customerId: "13000000-0000-4000-8000-000000000001", isPrimary: true, label: "", postalCode: "69001" };
    expect(customerAddressSchema.parse(values).countryCode).toBe("FR");
    expect(customerAddressSchema.safeParse({ ...values, countryCode: "FRA" }).success).toBe(false);
  });

  it("collects checkbox values from contact and address forms", () => {
    const contactFormData = new FormData();
    contactFormData.set("customerId", "13000000-0000-0000-0000-000000000001");
    contactFormData.set("isPrimary", "on");
    const addressFormData = new FormData();
    addressFormData.set("customerId", "13000000-0000-0000-0000-000000000001");
    expect(getCustomerContactValues(contactFormData)).toMatchObject({ isPrimary: true });
    expect(getCustomerAddressValues(addressFormData)).toMatchObject({ isPrimary: false });
  });
});
