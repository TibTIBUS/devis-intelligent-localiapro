import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { validateQuoteCompliance } from "@/lib/compliance/quote-compliance";

describe("quote compliance", () => {
  it("maps stable database issue codes to actionable French messages", async () => {
    const client = {
      rpc: async () => ({
        data: {
          errors: [{ code: "MISSING_WORKSITE_ADDRESS", field: "workAddressId" }],
          rulesVersion: "FR-BUILDING-QUOTE-2017-01",
          valid: false,
          warnings: [{ code: "VAT_STATUS_TO_CONFIRM", field: "company.vatNumber" }],
        },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = await validateQuoteCompliance(client, "13000000-0000-4000-8000-000000000001");

    expect(result.errors[0].message).toContain("lieu d’exécution");
    expect(result.warnings[0].message).toContain("régime de TVA");
  });

  it("rejects a malformed database response", async () => {
    const client = {
      rpc: async () => ({ data: { valid: true }, error: null }),
    } as unknown as SupabaseClient;

    await expect(
      validateQuoteCompliance(client, "13000000-0000-4000-8000-000000000001"),
    ).rejects.toThrow("résultat invalide");
  });
});
