"use server";

import { redirect } from "next/navigation";

import {
  getAuthFormValues,
  getFieldErrors,
  type AuthFormState,
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
