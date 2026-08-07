import { redirect } from "next/navigation";

import { PasswordUpdateForm } from "@/components/auth/password-update-form";
import { updatePassword } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/mot-de-passe-oublie?erreur=lien_invalide");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Choisissez un mot de passe d’au moins 8 caractères.
          </p>
        </div>
        <PasswordUpdateForm action={updatePassword} />
      </section>
    </main>
  );
}
