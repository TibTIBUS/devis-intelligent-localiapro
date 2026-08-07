"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/validation/auth";

type PasswordResetRequestFormProps = {
  action: (previousState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Veuillez patienter…" : "Envoyer le lien"}
    </Button>
  );
}

export function PasswordResetRequestForm({ action }: PasswordResetRequestFormProps) {
  const [state, formAction] = useActionState(action, initialAuthFormState);

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
