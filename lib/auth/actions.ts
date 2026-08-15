"use server";

import { redirect } from "next/navigation";

import {
  getAuthFormValues,
  getFieldErrors,
  getPasswordFormValues,
  type AuthFormState,
  passwordResetRequestSchema,
  passwordUpdateSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import { parsePublicEnv } from "@/lib/validation/env";
import { createClient } from "@/lib/supabase/server";

function validationError(error: Parameters<typeof getFieldErrors>[0]): AuthFormState {
  return {
    fieldErrors: getFieldErrors(error),
    message: "Vérifiez les informations saisies.",
    status: "error",
  };
}

export async function signInWithGoogle(): Promise<never> {
  const env = parsePublicEnv(process.env);
  redirect(`${env.NEXT_PUBLIC_APP_URL}/auth/google`);
}

export async function signIn(
  previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;
  const parsed = signInSchema.safeParse(getAuthFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      message: "Impossible de vous connecter avec ces informations.",
      status: "error",
    };
  }

  redirect("/tableau-de-bord");
}

export async function signUp(
  previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;
  const parsed = signUpSchema.safeParse(getAuthFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const env = parsePublicEnv(process.env);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return {
      message: "Impossible de créer votre compte pour le moment.",
      status: "error",
    };
  }

  if (data.session) {
    redirect("/tableau-de-bord");
  }

  return {
    message:
      "Si cette adresse peut être inscrite, un email de confirmation vient d’être envoyé.",
    status: "success",
  };
}

export async function requestPasswordReset(
  previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const env = parsePublicEnv(process.env);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/mot-de-passe/nouveau`,
  });

  return {
    message:
      "Si un compte correspond à cette adresse, un email de réinitialisation vient d’être envoyé.",
    status: "success",
  };
}

export async function updatePassword(
  previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  void previousState;
  const parsed = passwordUpdateSchema.safeParse(getPasswordFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/mot-de-passe-oublie?erreur=lien_invalide");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      message: "Impossible de modifier votre mot de passe pour le moment.",
      status: "error",
    };
  }

  redirect("/tableau-de-bord");
}

export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
