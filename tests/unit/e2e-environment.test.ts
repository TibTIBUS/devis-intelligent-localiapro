import { describe, expect, it } from "vitest";

import { assertE2eEnvironment } from "@/tests/e2e/environment";

describe("E2E environment", () => {
  it("désactive les tests distants sans URL", () => {
    expect(assertE2eEnvironment({ enabled: "false" })).toEqual({ enabled: false });
  });

  it("refuse une URL qui n'est pas explicitement isolée", () => {
    expect(() => assertE2eEnvironment({ E2E_BASE_URL: "https://production.example", E2E_ENVIRONMENT: "production" })).toThrow(/isolated/);
  });

  it("exige les identifiants et artefacts de test", () => {
    expect(() => assertE2eEnvironment({ E2E_BASE_URL: "https://preview.example", E2E_ENVIRONMENT: "isolated" })).toThrow(/Variables E2E manquantes/);
  });
});
