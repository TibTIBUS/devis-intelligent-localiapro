"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type GoogleOAuthFormProps = {
  action: () => Promise<void>;
};

function GoogleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending}
      type="submit"
      variant="outline"
    >
      {pending ? "Redirection vers Google…" : "Continuer avec Google"}
    </Button>
  );
}

export function GoogleOAuthForm({ action }: GoogleOAuthFormProps) {
  return (
    <form action={action}>
      <GoogleSubmitButton />
    </form>
  );
}
