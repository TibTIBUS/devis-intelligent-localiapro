import { z } from "zod";

const email = z.email("Saisissez une adresse email valide.");
const password = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.");

export const signInSchema = z.object({
  email,
  password,
});

export const signUpSchema = signInSchema
  .extend({
    passwordConfirmation: password,
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export const passwordResetRequestSchema = z.object({ email });

export const passwordUpdateSchema = z
  .object({
    password,
    passwordConfirmation: password,
  })
  .refine(({ password, passwordConfirmation }) => password === passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type AuthFormState = {
  fieldErrors?: Partial<Record<"email" | "password" | "passwordConfirmation", string>>;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialAuthFormState: AuthFormState = { status: "idle" };

export function getAuthFormValues(formData: FormData) {
  return {
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  };
}

export function getPasswordFormValues(formData: FormData) {
  return {
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  };
}

export function getFieldErrors(
  error: z.ZodError,
): AuthFormState["fieldErrors"] {
  const getMessage = (field: "email" | "password" | "passwordConfirmation") =>
    error.issues.find((issue) => issue.path[0] === field)?.message;

  return {
    email: getMessage("email"),
    password: getMessage("password"),
    passwordConfirmation: getMessage("passwordConfirmation"),
  };
}
