"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail, MapPin, Phone, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers/queries";
import {
  initialSimpleCustomerFormState,
  type SimpleCustomerFormState,
} from "@/lib/validation/customer";

type Action = (
  previousState: SimpleCustomerFormState,
  formData: FormData,
) => Promise<SimpleCustomerFormState>;

const inputClassName =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:border-[#17382D] focus:ring-2 focus:ring-[#17382D]/10";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      className="min-h-12 w-full rounded-xl bg-[#E8672E] text-sm font-semibold text-white hover:bg-[#D95E27] sm:w-auto sm:px-6"
      disabled={pending}
      type="submit"
    >
      {pending ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le client"}
    </Button>
  );
}

export function SimpleCustomerForm({ action, customer }: { action: Action; customer?: Customer }) {
  const [state, formAction] = useActionState(action, initialSimpleCustomerFormState);
  const contact = customer?.contacts.find((item) => item.is_primary) ?? customer?.contacts[0];
  const address = customer?.addresses.find((item) => item.is_primary) ?? customer?.addresses[0];
  const editing = Boolean(customer);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {customer ? <input name="customerId" type="hidden" value={customer.id} /> : null}
      {contact ? <input name="contactId" type="hidden" value={contact.id} /> : null}
      {address ? <input name="addressId" type="hidden" value={address.id} /> : null}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#17382D] text-[#F5F1E8]"><UserRound className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-[#17382D]">Client</h2>
            <p className="text-sm text-muted-foreground">Les informations utiles pour le devis.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="customer-name">Nom du client <span className="text-[#E8672E]">*</span></label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.displayName)}
              autoFocus={!editing}
              className={inputClassName}
              defaultValue={customer?.display_name ?? ""}
              id="customer-name"
              name="displayName"
              placeholder="Ex. Jean Dupont"
              required
              type="text"
            />
            <FieldError message={state.fieldErrors?.displayName} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="customer-phone"><Phone className="size-4 text-[#E8672E]" /> Téléphone</label>
              <input className={inputClassName} defaultValue={contact?.phone ?? ""} id="customer-phone" inputMode="tel" name="phone" placeholder="06 12 34 56 78" type="tel" />
              <FieldError message={state.fieldErrors?.phone} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="customer-email"><Mail className="size-4 text-[#E8672E]" /> E-mail</label>
              <input className={inputClassName} defaultValue={contact?.email ?? ""} id="customer-email" inputMode="email" name="email" placeholder="client@email.fr" type="email" />
              <FieldError message={state.fieldErrors?.email} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-[#17382D]"><MapPin className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-[#17382D]">Adresse</h2>
            <p className="text-sm text-muted-foreground">Adresse du client ou du chantier. Facultatif.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="customer-address">Adresse</label>
            <input className={inputClassName} defaultValue={address?.address_line_1 ?? ""} id="customer-address" name="addressLine1" placeholder="12 rue du Moulin" type="text" />
            <FieldError message={state.fieldErrors?.addressLine1} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="customer-postal-code">Code postal</label>
              <input className={inputClassName} defaultValue={address?.postal_code ?? ""} id="customer-postal-code" inputMode="numeric" name="postalCode" placeholder="50710" type="text" />
              <FieldError message={state.fieldErrors?.postalCode} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="customer-city">Ville</label>
              <input className={inputClassName} defaultValue={address?.city ?? ""} id="customer-city" name="city" placeholder="Créances" type="text" />
              <FieldError message={state.fieldErrors?.city} />
            </div>
          </div>
        </div>
      </section>

      {state.message ? <p aria-live="polite" className="text-sm text-destructive">{state.message}</p> : null}

      <div className="flex justify-end">
        <SaveButton editing={editing} />
      </div>
    </form>
  );
}
