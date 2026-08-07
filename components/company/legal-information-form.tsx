"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { CompanyLegalInformation } from "@/lib/company/queries";
import {
  formatShareCapital,
  initialCompanyLegalInformationFormState,
  type CompanyLegalInformationFormState,
} from "@/lib/validation/company-legal-information";

type CompanyLegalInformationAction = (
  previousState: CompanyLegalInformationFormState,
  formData: FormData,
) => Promise<CompanyLegalInformationFormState>;

type LegalInformationFormProps = {
  action: CompanyLegalInformationAction;
  legalInformation: CompanyLegalInformation | null;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? "Enregistrement en cours…" : "Enregistrer les informations légales"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function LegalInformationForm({
  action,
  legalInformation,
}: LegalInformationFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialCompanyLegalInformationFormState,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="legalName">
          Raison sociale ou nom
        </label>
        <input
          aria-invalid={Boolean(state.fieldErrors?.legalName)}
          autoComplete="organization"
          className={inputClassName}
          defaultValue={legalInformation?.legal_name}
          id="legalName"
          maxLength={200}
          name="legalName"
          required
          type="text"
        />
        <FieldError message={state.fieldErrors?.legalName} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="siren">
            SIREN
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.siren)}
            autoComplete="off"
            className={inputClassName}
            defaultValue={legalInformation?.siren}
            id="siren"
            inputMode="numeric"
            maxLength={11}
            name="siren"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.siren} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="siret">
            SIRET
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.siret)}
            autoComplete="off"
            className={inputClassName}
            defaultValue={legalInformation?.siret}
            id="siret"
            inputMode="numeric"
            maxLength={17}
            name="siret"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.siret} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="legalForm">
            Forme juridique
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.legalForm)}
            className={inputClassName}
            defaultValue={legalInformation?.legal_form ?? ""}
            id="legalForm"
            maxLength={80}
            name="legalForm"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.legalForm} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="shareCapital">
            Capital social HT <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.shareCapitalCents)}
            className={inputClassName}
            defaultValue={formatShareCapital(
              legalInformation?.share_capital_cents ?? null,
            )}
            id="shareCapital"
            inputMode="decimal"
            name="shareCapital"
            type="text"
          />
          <FieldError message={state.fieldErrors?.shareCapitalCents} />
        </div>
      </div>

      <fieldset className="space-y-2 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">
          Assurance professionnelle obligatoire pour votre activité
        </legend>
        <label className="mr-5 inline-flex items-center gap-2 text-sm">
          <input
            defaultChecked={legalInformation?.professional_insurance_required === true}
            name="professionalInsuranceRequired"
            type="radio"
            value="yes"
          />
          Oui
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            defaultChecked={legalInformation?.professional_insurance_required === false}
            name="professionalInsuranceRequired"
            type="radio"
            value="no"
          />
          Non
        </label>
        <p className="text-xs text-muted-foreground">
          Ne sélectionnez « Non » que si votre activité n’est soumise à aucune assurance professionnelle obligatoire.
        </p>
        <FieldError message={state.fieldErrors?.professionalInsuranceRequired} />
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="vatNumber">
            TVA intracommunautaire <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.vatNumber)}
            className={inputClassName}
            defaultValue={legalInformation?.vat_number ?? ""}
            id="vatNumber"
            maxLength={15}
            name="vatNumber"
            type="text"
          />
          <FieldError message={state.fieldErrors?.vatNumber} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="registrationCity">
            Ville d’immatriculation <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.registrationCity)}
            className={inputClassName}
            defaultValue={legalInformation?.registration_city ?? ""}
            id="registrationCity"
            maxLength={120}
            name="registrationCity"
            type="text"
          />
          <FieldError message={state.fieldErrors?.registrationCity} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="addressLine1">
          Adresse de l’établissement
        </label>
        <input
          aria-invalid={Boolean(state.fieldErrors?.addressLine1)}
          autoComplete="street-address"
          className={inputClassName}
          defaultValue={legalInformation?.address_line_1}
          id="addressLine1"
          maxLength={200}
          name="addressLine1"
          required
          type="text"
        />
        <FieldError message={state.fieldErrors?.addressLine1} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="addressLine2">
          Complément d’adresse <span className="text-muted-foreground">(facultatif)</span>
        </label>
        <input
          aria-invalid={Boolean(state.fieldErrors?.addressLine2)}
          autoComplete="address-line2"
          className={inputClassName}
          defaultValue={legalInformation?.address_line_2 ?? ""}
          id="addressLine2"
          maxLength={200}
          name="addressLine2"
          type="text"
        />
        <FieldError message={state.fieldErrors?.addressLine2} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="postalCode">
            Code postal
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.postalCode)}
            autoComplete="postal-code"
            className={inputClassName}
            defaultValue={legalInformation?.postal_code}
            id="postalCode"
            maxLength={20}
            name="postalCode"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.postalCode} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="city">
            Ville
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.city)}
            autoComplete="address-level2"
            className={inputClassName}
            defaultValue={legalInformation?.city}
            id="city"
            maxLength={120}
            name="city"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.city} />
        </div>
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
