import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { GoogleOAuthForm } from "@/components/auth/google-oauth-form";
import { signInWithGoogle, signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData) {
    redirect("/tableau-de-bord");
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Créer un compte</h1>
          <p className="text-sm text-muted-foreground">
            Utilisez au moins 8 caractères pour votre mot de passe.
          </p>
        </div>
        <GoogleOAuthForm action={signInWithGoogle} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou avec votre adresse email</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <EmailPasswordForm action={signUp} mode="sign-up" />
        <p className="text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link className="font-medium text-foreground underline" href="/connexion">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
