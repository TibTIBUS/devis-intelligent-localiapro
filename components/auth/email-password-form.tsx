"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/validation/auth";

type AuthAction = (
  previousState: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

type EmailPasswordFormProps = {
  action: AuthAction;
  mode: "sign-in" | "sign-up";
};

function SubmitButton({ mode }: Pick<EmailPasswordFormProps, "mode">) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending
        ? "Veuillez patienter…"
        : mode === "sign-in"
          ? "Se connecter"
          : "Créer mon compte"}
    </Button>
  );
}

export function EmailPasswordForm({ action, mode }: EmailPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialAuthFormState);
  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Adresse email
        </label>
        <input
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          autoComplete="email"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="email"
          name="email"
          required
          type="email"
        />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-destructive" id="email-error">
            {state.fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Mot de passe
        </label>
        <input
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive" id="password-error">
            {state.fieldErrors.password}
          </p>
        ) : null}
      </div>

      {isSignUp ? (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="passwordConfirmation">
            Confirmer le mot de passe
          </label>
          <input
            aria-describedby={
              state.fieldErrors?.passwordConfirmation
                ? "password-confirmation-error"
                : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.passwordConfirmation)}
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            id="passwordConfirmation"
            minLength={8}
            name="passwordConfirmation"
            required
            type="password"
          />
          {state.fieldErrors?.passwordConfirmation ? (
            <p className="text-sm text-destructive" id="password-confirmation-error">
              {state.fieldErrors.passwordConfirmation}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"
          }
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}
