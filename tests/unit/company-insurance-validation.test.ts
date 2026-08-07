import { describe, expect, it } from "vitest";

import {
  companyInsuranceSchema,
  getCompanyInsuranceValues,
} from "@/lib/validation/company-insurance";

const validInsurance = {
  activitiesCovered: "Plomberie sanitaire",
  geographicCoverage: "France métropolitaine",
  insuranceType: "Responsabilité civile décennale",
  insurerContactDetails: "10 avenue des Assurances, 75001 Paris",
  insurerName: "Assureur A",
  policyNumber: "POLICE-A-001",
  validFrom: "2026-01-01",
  validUntil: "2026-12-31",
};

describe("companyInsuranceSchema", () => {
  it("accepts a complete insurance", () => {
    expect(companyInsuranceSchema.safeParse(validInsurance).success).toBe(true);
  });

  it("rejects an insurance whose end date precedes its start date", () => {
    expect(
      companyInsuranceSchema.safeParse({
        ...validInsurance,
        validUntil: "2025-12-31",
      }).success,
    ).toBe(false);
  });

  it("accepts optional activities and validity dates left blank", () => {
    expect(
      companyInsuranceSchema.safeParse({
        ...validInsurance,
        activitiesCovered: "",
        validFrom: "",
        validUntil: "",
      }).success,
    ).toBe(true);
  });

  it("collects the optional insurance identifier from a form", () => {
    const formData = new FormData();
    formData.set("insuranceId", "30000000-0000-0000-0000-000000000001");
    formData.set("insuranceType", "Responsabilité civile professionnelle");

    expect(getCompanyInsuranceValues(formData)).toMatchObject({
      insuranceId: "30000000-0000-0000-0000-000000000001",
      insuranceType: "Responsabilité civile professionnelle",
    });
  });
});
