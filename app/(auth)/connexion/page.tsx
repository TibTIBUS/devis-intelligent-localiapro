import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { GoogleOAuthForm } from "@/components/auth/google-oauth-form";
import { signIn, signInWithGoogle } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{ erreur?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (claimsData) redirect("/tableau-de-bord");

  return (
    <AuthShell description="Connectez-vous pour retrouver vos clients, votre catalogue et vos devis." title="Bienvenue !">
      <div className="space-y-5">
        {erreur ? <p aria-live="polite" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">La connexion n’a pas pu être finalisée. Veuillez réessayer.</p> : null}
        <GoogleOAuthForm action={signInWithGoogle} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>ou avec votre adresse email</span><span className="h-px flex-1 bg-border" /></div>
        <EmailPasswordForm action={signIn} mode="sign-in" />
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link className="font-medium text-primary hover:underline" href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          <p className="text-muted-foreground">Pas encore de compte ? <Link className="font-medium text-foreground hover:underline" href="/inscription">Créer un compte</Link></p>
        </div>
      </div>
    </AuthShell>
  );
}
