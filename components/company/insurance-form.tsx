"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { CompanyInsurance } from "@/lib/company/insurance-queries";
import {
  initialCompanyInsuranceDeleteFormState,
  initialCompanyInsuranceFormState,
  type CompanyInsuranceDeleteFormState,
  type CompanyInsuranceFormState,
} from "@/lib/validation/company-insurance";

type CompanyInsuranceAction = (
  previousState: CompanyInsuranceFormState,
  formData: FormData,
) => Promise<CompanyInsuranceFormState>;

type DeleteCompanyInsuranceAction = (
  previousState: CompanyInsuranceDeleteFormState,
  formData: FormData,
) => Promise<CompanyInsuranceDeleteFormState>;

type InsuranceFormProps = {
  action: CompanyInsuranceAction;
  deleteAction?: DeleteCompanyInsuranceAction;
  insurance?: CompanyInsurance;
};

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const textAreaClassName =
  "min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending
        ? "Enregistrement en cours…"
        : isEditing
          ? "Enregistrer les modifications"
          : "Ajouter l’assurance"}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function DeleteInsuranceForm({
  action,
  insuranceId,
}: {
  action: DeleteCompanyInsuranceAction;
  insuranceId: string;
}) {
  const [state, formAction] = useActionState(
    action,
    initialCompanyInsuranceDeleteFormState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input name="insuranceId" type="hidden" value={insuranceId} />
      <Button type="submit" variant="destructive">
        Supprimer cette assurance
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function InsuranceForm({ action, deleteAction, insurance }: InsuranceFormProps) {
  const [state, formAction] = useActionState(action, initialCompanyInsuranceFormState);
  const isEditing = Boolean(insurance);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <form action={formAction} className="space-y-4" noValidate>
        {insurance ? <input name="insuranceId" type="hidden" value={insurance.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`insurance-type-${insurance?.id ?? "new"}`}>
              Type d’assurance
            </label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.insuranceType)}
              className={inputClassName}
              defaultValue={insurance?.insurance_type}
              id={`insurance-type-${insurance?.id ?? "new"}`}
              maxLength={120}
              name="insuranceType"
              required
              type="text"
            />
            <FieldError message={state.fieldErrors?.insuranceType} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`policy-number-${insurance?.id ?? "new"}`}>
              Numéro de police
            </label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.policyNumber)}
              className={inputClassName}
              defaultValue={insurance?.policy_number}
              id={`policy-number-${insurance?.id ?? "new"}`}
              maxLength={120}
              name="policyNumber"
              required
              type="text"
            />
            <FieldError message={state.fieldErrors?.policyNumber} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`insurer-name-${insurance?.id ?? "new"}`}>
            Assureur
          </label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.insurerName)}
            className={inputClassName}
            defaultValue={insurance?.insurer_name}
            id={`insurer-name-${insurance?.id ?? "new"}`}
            maxLength={160}
            name="insurerName"
            required
            type="text"
          />
          <FieldError message={state.fieldErrors?.insurerName} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`insurer-contact-${insurance?.id ?? "new"}`}>
            Coordonnées de l’assureur
          </label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.insurerContactDetails)}
            className={textAreaClassName}
            defaultValue={insurance?.insurer_contact_details}
            id={`insurer-contact-${insurance?.id ?? "new"}`}
            maxLength={500}
            name="insurerContactDetails"
            required
          />
          <FieldError message={state.fieldErrors?.insurerContactDetails} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`coverage-${insurance?.id ?? "new"}`}>
            Couverture géographique
          </label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.geographicCoverage)}
            className={textAreaClassName}
            defaultValue={insurance?.geographic_coverage}
            id={`coverage-${insurance?.id ?? "new"}`}
            maxLength={500}
            name="geographicCoverage"
            required
          />
          <FieldError message={state.fieldErrors?.geographicCoverage} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`activities-${insurance?.id ?? "new"}`}>
            Activités couvertes <span className="text-muted-foreground">(facultatif)</span>
          </label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.activitiesCovered)}
            className={textAreaClassName}
            defaultValue={insurance?.activities_covered ?? ""}
            id={`activities-${insurance?.id ?? "new"}`}
            maxLength={500}
            name="activitiesCovered"
          />
          <FieldError message={state.fieldErrors?.activitiesCovered} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`valid-from-${insurance?.id ?? "new"}`}>
              Début de validité <span className="text-muted-foreground">(facultatif)</span>
            </label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.validFrom)}
              className={inputClassName}
              defaultValue={insurance?.valid_from ?? ""}
              id={`valid-from-${insurance?.id ?? "new"}`}
              name="validFrom"
              type="date"
            />
            <FieldError message={state.fieldErrors?.validFrom} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`valid-until-${insurance?.id ?? "new"}`}>
              Fin de validité <span className="text-muted-foreground">(facultatif)</span>
            </label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.validUntil)}
              className={inputClassName}
              defaultValue={insurance?.valid_until ?? ""}
              id={`valid-until-${insurance?.id ?? "new"}`}
              name="validUntil"
              type="date"
            />
            <FieldError message={state.fieldErrors?.validUntil} />
          </div>
        </div>

        {state.message ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {state.message}
          </p>
        ) : null}

        <SubmitButton isEditing={isEditing} />
      </form>

      {insurance && deleteAction ? (
        <DeleteInsuranceForm action={deleteAction} insuranceId={insurance.id} />
      ) : null}
    </div>
  );
}
