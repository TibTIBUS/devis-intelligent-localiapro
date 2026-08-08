import { afterEach, describe, expect, it, vi } from "vitest";

import { createRequestId, logTechnicalError, logTechnicalInfo, logTechnicalWarning } from "@/lib/observability/logger";

afterEach(() => vi.restoreAllMocks());

describe("technical observability logger", () => {
  it("emits only structured technical identifiers for errors", () => {
    const error = Object.assign(new Error("client@example.test sk-secret-value"), { code: "23505" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logTechnicalError("ai.tool_call_failed", {
      organizationId: "10000000-0000-0000-0000-000000000001",
      quoteId: "31000000-0000-0000-0000-000000000001",
      requestId: "55000000-0000-0000-0000-000000000001",
      toolName: "set_discount",
      userId: "00000000-0000-0000-0000-000000000001",
      // Simule une donnée inattendue reçue à l’exécution : elle ne doit jamais être sérialisée.
      ...( { conversation: "coordonnées confidentielles" } as object),
    }, error);

    const entry = JSON.parse(spy.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(entry).toMatchObject({
      error_code: "23505",
      event: "ai.tool_call_failed",
      level: "error",
      tool_name: "set_discount",
    });
    expect(JSON.stringify(entry)).not.toContain("client@example.test");
    expect(JSON.stringify(entry)).not.toContain("sk-secret-value");
    expect(JSON.stringify(entry)).not.toContain("coordonnées confidentielles");
  });

  it("supports warning and information events with bounded rule codes", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logTechnicalWarning("quote.compliance_blocked_finalization", {
      quoteId: "31000000-0000-0000-0000-000000000001",
      ruleCodes: ["MISSING_QUOTE_LINE", "email@example.test"],
    });
    logTechnicalInfo("pdf.generated", { documentId: "41000000-0000-0000-0000-000000000001" });

    expect(JSON.parse(warning.mock.calls[0][0] as string).rule_codes).toEqual(["MISSING_QUOTE_LINE"]);
    expect(JSON.parse(info.mock.calls[0][0] as string)).toMatchObject({ event: "pdf.generated", level: "info" });
  });

  it("creates UUID request identifiers", () => {
    expect(createRequestId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
