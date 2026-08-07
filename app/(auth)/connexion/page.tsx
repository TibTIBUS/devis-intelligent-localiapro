import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailPasswordForm } from "@/components/auth/email-password-form";
import { signIn } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
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
          <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
        </div>
        <EmailPasswordForm action={signIn} mode="sign-in" />
        <Link className="text-sm font-medium underline" href="/mot-de-passe-oublie">
          Mot de passe oublié ?
        </Link>
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link className="font-medium text-foreground underline" href="/inscription">
            Créer un compte
          </Link>
        </p>
      </section>
    </main>
  );
}
