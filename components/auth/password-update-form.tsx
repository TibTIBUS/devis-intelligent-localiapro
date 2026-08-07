"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/validation/auth";

type PasswordUpdateFormProps = {
  action: (previousState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Veuillez patienter…" : "Enregistrer le mot de passe"}
    </Button>
  );
}

export function PasswordUpdateForm({ action }: PasswordUpdateFormProps) {
  const [state, formAction] = useActionState(action, initialAuthFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.password)}
          autoComplete="new-password"
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
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="passwordConfirmation">
          Confirmer le nouveau mot de passe
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
      <SubmitButton />
    </form>
  );
}
