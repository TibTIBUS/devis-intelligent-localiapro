import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { updatePassword } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) redirect("/mot-de-passe-oublie?erreur=lien_invalide");

  return (
    <AuthShell description="Choisissez un nouveau mot de passe d’au moins 8 caractères pour sécuriser votre compte." title="Nouveau mot de passe">
      <PasswordUpdateForm action={updatePassword} />
    </AuthShell>
  );
}
