import { describe, expect, it } from "vitest";

import { generateQuotePdf } from "@/lib/pdf/generate-quote-pdf";
import { parseQuotePdfData } from "@/lib/pdf/quote-snapshot";

const snapshot = {
  schemaVersion: 1,
  quote: {
    id: "31000000-0000-4000-8000-000000000001",
    number: "D-2026-00001",
    issuedOn: "2026-08-07",
    validUntil: "2026-09-06",
    isFree: true,
    note: "Accès au chantier par la cour.",
    paymentTerms: "Paiement à réception.",
    discountRateBasisPoints: 500,
    depositRateBasisPoints: 3000,
  },
  company: {
    legal_name: "Entreprise Martin",
    legal_form: "SARL",
    share_capital_cents: 100000,
    siren: "123456789",
    siret: "12345678900011",
    vat_number: "FR12123456789",
    registration_city: "Paris",
    address_line_1: "1 rue des Artisans",
    address_line_2: null,
    postal_code: "75001",
    city: "Paris",
  },
  customer: {
    id: "21000000-0000-4000-8000-000000000001",
    displayName: "Client Martin",
    workAddress: {
      address_line_1: "2 rue du Chantier",
      address_line_2: null,
      postal_code: "75002",
      city: "Paris",
      country_code: "FR",
    },
    contacts: [],
  },
  sections: [{ id: "32000000-0000-4000-8000-000000000001", title: "Travaux", position: 0 }],
  lines: [{
    id: "33000000-0000-4000-8000-000000000001",
    sectionId: "32000000-0000-4000-8000-000000000001",
    label: "Main d’œuvre plomberie",
    description: "Pose et raccordement",
    unit: "heure",
    quantityMilliunits: 2000,
    unitPriceHtCents: 5500,
    vatRateBasisPoints: 2000,
    position: 0,
    lineKind: "labor",
  }],
};

const complianceSnapshot = {
  rulesVersion: "FR-BUILDING-QUOTE-2017-01",
  preparationFeeHtCents: null,
  preparationFeeVatRateBasisPoints: null,
  travelFeeApplicable: false,
  professionalInsuranceRequired: false,
  insurances: [],
};

describe("quote PDF", () => {
  it("normalizes the immutable snapshot into PDF data", () => {
    const data = parseQuotePdfData(snapshot, complianceSnapshot);

    expect(data.snapshot.lines[0].quantityMilliunits).toBe(2000n);
    expect(data.snapshot.lines[0].unitPriceHtCents).toBe(5500n);
    expect(data.snapshot.company.legalName).toBe("Entreprise Martin");
    expect(data.snapshot.quote.paymentTerms).toBe("Paiement à réception.");
  });

  it("renders a real PDF buffer without live application data", async () => {
    const buffer = await generateQuotePdf(snapshot, complianceSnapshot);

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(buffer.byteLength).toBeGreaterThan(1_000);
  }, 10_000);
});
