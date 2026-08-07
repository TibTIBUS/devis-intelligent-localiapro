import Link from "next/link";

import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";
import { requestPasswordReset } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>
        <PasswordResetRequestForm action={requestPasswordReset} />
        <Link className="text-sm font-medium underline" href="/connexion">
          Retour à la connexion
        </Link>
      </section>
    </main>
  );
}
