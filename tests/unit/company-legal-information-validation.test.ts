import { describe, expect, it } from "vitest";

import {
  companyLegalInformationSchema,
  formatShareCapital,
  getCompanyLegalInformationValues,
} from "@/lib/validation/company-legal-information";

const validLegalInformation = {
  addressLine1: "1 rue des Artisans",
  addressLine2: "",
  city: "Paris",
  legalForm: "SARL",
  legalName: "Entreprise Martin",
  postalCode: "75001",
  registrationCity: "Paris",
  shareCapitalCents: "1 000,50",
  siren: "123 456 789",
  siret: "123 456 789 00011",
  vatNumber: "fr 12 123456789",
};

describe("companyLegalInformationSchema", () => {
  it("normalizes French identifiers, VAT and share capital", () => {
    expect(companyLegalInformationSchema.parse(validLegalInformation)).toMatchObject({
      shareCapitalCents: 100050,
      siren: "123456789",
      siret: "12345678900011",
      vatNumber: "FR12123456789",
    });
  });

  it("rejects a SIRET that does not start with the SIREN", () => {
    expect(
      companyLegalInformationSchema.safeParse({
        ...validLegalInformation,
        siret: "98765432100011",
      }).success,
    ).toBe(false);
  });

  it("accepts optional legal fields left blank", () => {
    expect(
      companyLegalInformationSchema.safeParse({
        ...validLegalInformation,
        addressLine2: "",
        legalForm: "",
        registrationCity: "",
        shareCapitalCents: "",
        vatNumber: "",
      }).success,
    ).toBe(true);
  });

  it("collects form values and formats capital for display", () => {
    const formData = new FormData();
    formData.set("legalName", "Entreprise Martin");
    formData.set("shareCapital", "10,00");

    expect(getCompanyLegalInformationValues(formData)).toMatchObject({
      legalName: "Entreprise Martin",
      shareCapitalCents: "10,00",
    });
    expect(formatShareCapital(1000)).toBe("10,00");
    expect(formatShareCapital(null)).toBe("");
  });
});
