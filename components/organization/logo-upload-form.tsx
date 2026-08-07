"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialLogoFormState,
  type LogoFormState,
} from "@/lib/storage/organization-logo";

type LogoUploadAction = (
  previousState: LogoFormState,
  formData: FormData,
) => Promise<LogoFormState>;

type LogoUploadFormProps = {
  action: LogoUploadAction;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Envoi en cours…" : "Enregistrer le logo"}
    </Button>
  );
}

export function LogoUploadForm({ action }: LogoUploadFormProps) {
  const [state, formAction] = useActionState(action, initialLogoFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="logo">
          Fichier du logo
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="logo-help"
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
          id="logo"
          name="logo"
          required
          type="file"
        />
        <p className="text-xs text-muted-foreground" id="logo-help">
          JPEG, PNG ou WebP, 2 Mo maximum.
        </p>
      </div>

      {state.message ? (
        <p aria-live="polite" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
