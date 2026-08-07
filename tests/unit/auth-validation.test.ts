import { describe, expect, it } from "vitest";

import {
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

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

  it("validates a password reset email", () => {
    expect(
      passwordResetRequestSchema.safeParse({ email: "artisan@example.test" }).success,
    ).toBe(true);
  });

  it("requires matching passwords when updating a password", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "mot-de-passe-solide",
        passwordConfirmation: "un-autre-mot-de-passe",
      }).success,
    ).toBe(false);
  });
});
