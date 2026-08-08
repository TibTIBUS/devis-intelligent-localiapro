import { describe, expect, it } from "vitest";

import { MAX_AI_JSON_BODY_BYTES, parseBoundedAiJsonRequest } from "@/lib/security/bounded-json-request";

function jsonRequest(body: string, headers: HeadersInit = {}) {
  return new Request("https://example.test/api/ai", {
    body,
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

describe("bounded AI JSON requests", () => {
  it("parses a JSON request within the server limit", async () => {
    await expect(parseBoundedAiJsonRequest(jsonRequest('{"quoteId":"quote"}'))).resolves.toEqual({
      data: { quoteId: "quote" },
      success: true,
    });
  });

  it("rejects non-JSON content before reading the body", async () => {
    await expect(parseBoundedAiJsonRequest(new Request("https://example.test/api/ai", {
      body: "quoteId=quote",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    }))).resolves.toMatchObject({ status: 415, success: false });
  });

  it("rejects an oversized declared body", async () => {
    await expect(parseBoundedAiJsonRequest(jsonRequest("{}", {
      "content-length": String(MAX_AI_JSON_BODY_BYTES + 1),
    }))).resolves.toMatchObject({ status: 413, success: false });
  });

  it("rejects an oversized streamed body", async () => {
    await expect(parseBoundedAiJsonRequest(jsonRequest(`"${"a".repeat(MAX_AI_JSON_BODY_BYTES)}"`)))
      .resolves.toMatchObject({ status: 413, success: false });
  });

  it("rejects malformed JSON", async () => {
    await expect(parseBoundedAiJsonRequest(jsonRequest("{"))).resolves.toMatchObject({ status: 400, success: false });
  });
});
