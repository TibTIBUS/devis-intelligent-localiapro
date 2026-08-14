import { describe, expect, it } from "vitest";

import { extractVoiceVatRate, matchVoiceConfirmation } from "@/lib/ai/voice-confirmation";

describe("matchVoiceConfirmation", () => {
  it("recognizes an explicit confirmation", () => {
    expect(matchVoiceConfirmation("je confirme")).toBe("confirm");
    expect(matchVoiceConfirmation("Je Confirme.")).toBe("confirm");
    expect(matchVoiceConfirmation("  je   confirme  ")).toBe("confirm");
  });

  it("recognizes a short natural confirmation, since it always follows a direct yes/no readback", () => {
    expect(matchVoiceConfirmation("oui")).toBe("confirm");
    expect(matchVoiceConfirmation("Oui.")).toBe("confirm");
    expect(matchVoiceConfirmation("d'accord")).toBe("confirm");
    expect(matchVoiceConfirmation("ok")).toBe("confirm");
    expect(matchVoiceConfirmation("c'est bon")).toBe("confirm");
  });

  it("recognizes an explicit cancellation", () => {
    expect(matchVoiceConfirmation("j'annule")).toBe("cancel");
    expect(matchVoiceConfirmation("annule")).toBe("cancel");
    expect(matchVoiceConfirmation("non")).toBe("cancel");
  });

  it("is accent and case insensitive", () => {
    expect(matchVoiceConfirmation("JE CONFIRME")).toBe("confirm");
    expect(matchVoiceConfirmation("j'ánnule")).toBe("cancel");
  });

  it("treats anything ambiguous as unclear rather than acting", () => {
    expect(matchVoiceConfirmation("ouais c'est bon je pense")).toBe("unclear");
    expect(matchVoiceConfirmation("")).toBe("unclear");
    expect(matchVoiceConfirmation("confirme peut-être")).toBe("unclear");
    expect(matchVoiceConfirmation("peut-être")).toBe("unclear");
  });
});

describe("extractVoiceVatRate", () => {
  it("extracts a rate followed by a percent sign or word", () => {
    expect(extractVoiceVatRate("je confirme 10 %")).toBe("10");
    expect(extractVoiceVatRate("je confirme dix pour cent, 10 pour cent")).toBe("10");
    expect(extractVoiceVatRate("je confirme 5,5 pourcent")).toBe("5,5");
    expect(extractVoiceVatRate("20%")).toBe("20");
  });

  it("returns null when no explicit rate is stated", () => {
    expect(extractVoiceVatRate("je confirme")).toBeNull();
    expect(extractVoiceVatRate("mets la TVA normale")).toBeNull();
    expect(extractVoiceVatRate("je confirme 150 pour cent")).toBeNull();
  });
});
