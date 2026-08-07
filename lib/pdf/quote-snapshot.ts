import { z } from "zod";

const integerBigInt = z.union([z.bigint(), z.number(), z.string()]).transform((value) => BigInt(value));
const nullableIntegerBigInt = z.union([z.bigint(), z.number(), z.string()]).transform((value) => BigInt(value)).nullable();

const companySchema = z.object({
  address_line_1: z.string(),
  address_line_2: z.string().nullable().optional(),
  city: z.string(),
  legal_form: z.string(),
  legal_name: z.string(),
  postal_code: z.string(),
  professional_insurance_required: z.boolean().nullable().optional(),
  registration_city: z.string().nullable().optional(),
  share_capital_cents: nullableIntegerBigInt,
  siren: z.string(),
  siret: z.string(),
  vat_number: z.string().nullable().optional(),
}).transform((company) => ({
  addressLine1: company.address_line_1,
  addressLine2: company.address_line_2 ?? null,
  city: company.city,
  legalForm: company.legal_form,
  legalName: company.legal_name,
  postalCode: company.postal_code,
  professionalInsuranceRequired: company.professional_insurance_required ?? null,
  registrationCity: company.registration_city ?? null,
  shareCapitalCents: company.share_capital_cents,
  siren: company.siren,
  siret: company.siret,
  vatNumber: company.vat_number ?? null,
}));

const snapshotLineSchema = z.object({
  description: z.string().nullable().optional(),
  id: z.string(),
  label: z.string(),
  lineKind: z.enum(["labor", "material", "travel", "service", "other"]).default("service"),
  position: z.number().int(),
  quantityMilliunits: integerBigInt,
  sectionId: z.string().nullable(),
  unit: z.string(),
  unitPriceHtCents: nullableIntegerBigInt,
  vatRateBasisPoints: z.number().int().nullable(),
});

const snapshotSchema = z.object({
  company: companySchema,
  customer: z.object({
    contacts: z.array(z.record(z.string(), z.unknown())).default([]),
    displayName: z.string(),
    id: z.string(),
    workAddress: z.object({
      address_line_1: z.string(),
      address_line_2: z.string().nullable().optional(),
      city: z.string(),
      country_code: z.string().optional(),
      postal_code: z.string(),
    }).transform((address) => ({
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2 ?? null,
      city: address.city,
      countryCode: address.country_code,
      postalCode: address.postal_code,
    })),
  }),
  lines: z.array(snapshotLineSchema),
  quote: z.object({
    depositRateBasisPoints: z.number().int(),
    discountRateBasisPoints: z.number().int(),
    id: z.string(),
    isFree: z.boolean(),
    number: z.string(),
    issuedOn: z.string().date(),
    validUntil: z.string().date(),
  }),
  schemaVersion: z.literal(1),
  sections: z.array(z.object({ id: z.string(), position: z.number().int(), title: z.string() })),
});

const complianceSnapshotSchema = z.object({
  insurances: z.array(z.object({
    geographic_coverage: z.string(),
    insurance_type: z.string(),
    insurer_name: z.string(),
    policy_number: z.string(),
  })).default([]),
  preparationFeeHtCents: nullableIntegerBigInt,
  preparationFeeVatRateBasisPoints: z.number().int().nullable(),
  professionalInsuranceRequired: z.boolean().nullable(),
  rulesVersion: z.string(),
  travelFeeApplicable: z.boolean(),
});

export type QuotePdfLine = z.infer<typeof snapshotLineSchema>;
export type QuotePdfData = {
  complianceSnapshot: z.infer<typeof complianceSnapshotSchema>;
  snapshot: z.infer<typeof snapshotSchema>;
};

export function parseQuotePdfData(snapshot: unknown, complianceSnapshot: unknown): QuotePdfData {
  return {
    complianceSnapshot: complianceSnapshotSchema.parse(complianceSnapshot),
    snapshot: snapshotSchema.parse(snapshot),
  };
}
