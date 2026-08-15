"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  initialOrganizationFormState,
  type OrganizationFormState,
} from "@/lib/validation/organization";

type InitialOrganizationAction = (
  previousState: OrganizationFormState,
  formData: FormData,
) => Promise<OrganizationFormState>;

type InitialOrganizationFormProps = {
  action: InitialOrganizationAction;
};

const suggestedTrades = [
  "Maçonnerie",
  "Plomberie",
  "Électricité",
  "Peinture",
  "Menuiserie",
  "Paysagisme",
  "Garage / carrosserie",
  "Nettoyage professionnel",
  "Boulangerie",
  "Boucherie / charcuterie / traiteur",
  "Fleuriste",
  "Événementiel",
  "Services aux entreprises",
];

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Création en cours…" : "Créer mon entreprise"}
    </Button>
  );
}

export function InitialOrganizationForm({ action }: InitialOrganizationFormProps) {
  const [state, formAction] = useActionState(action, initialOrganizationFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">
          Nom de l’entreprise
        </label>
        <input
          aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          autoComplete="organization"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="name"
          maxLength={120}
          name="name"
          required
          type="text"
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive" id="name-error">
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="trade">
          Votre activité ou métier
        </label>
        <input
          aria-describedby={state.fieldErrors?.trade ? "trade-error" : "trade-help"}
          aria-invalid={Boolean(state.fieldErrors?.trade)}
          autoComplete="organization-title"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="trade"
          list="trade-suggestions"
          maxLength={80}
          name="trade"
          placeholder="Ex. boulangerie, maçonnerie, garage…"
          required
          type="text"
        />
        <datalist id="trade-suggestions">
          {suggestedTrades.map((trade) => <option key={trade} value={trade} />)}
        </datalist>
        <p className="text-xs text-muted-foreground" id="trade-help">
          Saisissez librement votre activité si elle n’apparaît pas dans les suggestions. Nalto adaptera son assistant à votre métier.
        </p>
        {state.fieldErrors?.trade ? (
          <p className="text-sm text-destructive" id="trade-error">
            {state.fieldErrors.trade}
          </p>
        ) : null}
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
