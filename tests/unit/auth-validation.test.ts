import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("auth validation", () => {
  it("accepts valid email/password credentials", () => {
    expect(
      signInSchema.safeParse({
        email: "artisan@example.test",
        password: "mot-de-passe-solide",
      }).success,
    ).toBe(true);
  });

  it("rejects an invalid email and a short password", () => {
    expect(
      signInSchema.safeParse({ email: "invalide", password: "court" }).success,
    ).toBe(false);
  });

  it("requires identical password confirmation on sign-up", () => {
    expect(
      signUpSchema.safeParse({
        email: "artisan@example.test",
        password: "mot-de-passe-solide",
        passwordConfirmation: "une-autre-valeur",
      }).success,
    ).toBe(false);
  });
});
