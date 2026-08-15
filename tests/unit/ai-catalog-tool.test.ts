import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { searchCatalogForAssistant } from "@/lib/catalog/assistant-service";
import { searchCatalogTool } from "@/lib/ai/tools/search-catalog";

describe("AI catalog tool", () => {
  it("uses a strict schema without exposing the organization identifier", () => {
    expect(searchCatalogTool.strict).toBe(true);
    expect(searchCatalogTool.parameters.additionalProperties).toBe(false);
    expect(searchCatalogTool.parameters.properties).not.toHaveProperty("organizationId");
  });

  it("scopes and limits catalog searches on the server", async () => {
    const limit = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn(() => ({ limit }));
    const or = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ or }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;

    await searchCatalogForAssistant(client, "organization-1", "plomberie évier");

    expect(from).toHaveBeenCalledWith("catalog_items");
    expect(eq).toHaveBeenCalledWith("organization_id", "organization-1");
    expect(or).toHaveBeenCalledWith(
      "name.ilike.%plomberie%,description.ilike.%plomberie%,name.ilike.%evier%,description.ilike.%evier%",
    );
    expect(limit).toHaveBeenCalledWith(24);
  });
});
