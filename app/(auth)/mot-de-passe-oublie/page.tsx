import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";
import { requestPasswordReset } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  return (
    <AuthShell description="Saisissez votre adresse email. Nous vous enverrons un lien pour choisir un nouveau mot de passe." title="Mot de passe oublié ?">
      <div className="space-y-5">
        <PasswordResetRequestForm action={requestPasswordReset} />
        <Link className="inline-flex text-sm font-medium text-primary hover:underline" href="/connexion">Retour à la connexion</Link>
      </div>
    </AuthShell>
  );
}
