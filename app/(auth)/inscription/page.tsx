import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { GoogleOAuthForm } from "@/components/auth/google-oauth-form";
import { signInWithGoogle, signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function SignUpPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (claimsData) redirect("/tableau-de-bord");

  return (
    <AuthShell description="Créez votre espace et commencez à préparer vos devis en quelques minutes." title="Créer votre compte">
      <div className="space-y-5">
        <GoogleOAuthForm action={signInWithGoogle} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>ou avec votre adresse email</span><span className="h-px flex-1 bg-border" /></div>
        <EmailPasswordForm action={signUp} mode="sign-up" />
        <p className="text-sm text-muted-foreground">Utilisez au moins 8 caractères pour votre mot de passe.</p>
        <p className="text-sm text-muted-foreground">Déjà inscrit ? <Link className="font-medium text-foreground hover:underline" href="/connexion">Se connecter</Link></p>
      </div>
    </AuthShell>
  );
}
