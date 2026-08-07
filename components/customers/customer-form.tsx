"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { Customer, CustomerAddress, CustomerContact } from "@/lib/customers/queries";
import {
  initialCustomerAddressFormState,
  initialCustomerContactFormState,
  initialCustomerFormState,
  type CustomerAddressFormState,
  type CustomerContactFormState,
  type CustomerFormState,
} from "@/lib/validation/customer";

type CustomerAction = (previousState: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
type ContactAction = (previousState: CustomerContactFormState, formData: FormData) => Promise<CustomerContactFormState>;
type AddressAction = (previousState: CustomerAddressFormState, formData: FormData) => Promise<CustomerAddressFormState>;

type CustomerFormProps = {
  addressAction: AddressAction;
  contactAction: ContactAction;
  customerAction: CustomerAction;
  customer?: Customer;
};

const inputClassName = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function SubmitButton({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Enregistrement en cours…" : children}</Button>;
}

function CustomerIdentityForm({ action, customer }: { action: CustomerAction; customer?: Customer }) {
  const [state, formAction] = useActionState(action, initialCustomerFormState);
  const id = customer?.id ?? "new";
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {customer ? <input name="customerId" type="hidden" value={customer.id} /> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`customer-name-${id}`}>Nom du client</label>
        <input aria-invalid={Boolean(state.fieldErrors?.displayName)} className={inputClassName} defaultValue={customer?.display_name} id={`customer-name-${id}`} maxLength={200} name="displayName" required type="text" />
        <FieldError message={state.fieldErrors?.displayName} />
      </div>
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <SubmitButton>{customer ? "Enregistrer les modifications" : "Ajouter le client"}</SubmitButton>
    </form>
  );
}

function ContactForm({ action, contact, customerId }: { action: ContactAction; contact?: CustomerContact; customerId: string }) {
  const [state, formAction] = useActionState(action, initialCustomerContactFormState);
  const id = contact?.id ?? "new";
  return (
    <form action={formAction} className="space-y-4 rounded-md border border-border p-4" noValidate>
      <input name="customerId" type="hidden" value={customerId} />
      {contact ? <input name="contactId" type="hidden" value={contact.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`contact-name-${id}`}>Nom <span className="text-muted-foreground">(facultatif)</span></label>
          <input aria-invalid={Boolean(state.fieldErrors?.name)} className={inputClassName} defaultValue={contact?.name ?? ""} id={`contact-name-${id}`} maxLength={200} name="name" type="text" />
          <FieldError message={state.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`contact-phone-${id}`}>Téléphone <span className="text-muted-foreground">(facultatif)</span></label>
          <input aria-invalid={Boolean(state.fieldErrors?.phone)} className={inputClassName} defaultValue={contact?.phone ?? ""} id={`contact-phone-${id}`} maxLength={50} name="phone" type="tel" />
          <FieldError message={state.fieldErrors?.phone} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`contact-email-${id}`}>E-mail <span className="text-muted-foreground">(facultatif)</span></label>
        <input aria-invalid={Boolean(state.fieldErrors?.email)} className={inputClassName} defaultValue={contact?.email ?? ""} id={`contact-email-${id}`} maxLength={254} name="email" type="email" />
        <FieldError message={state.fieldErrors?.email} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor={`contact-primary-${id}`}>
        <input defaultChecked={contact?.is_primary} id={`contact-primary-${id}`} name="isPrimary" type="checkbox" /> Contact principal
      </label>
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <SubmitButton>{contact ? "Modifier le contact" : "Ajouter un contact"}</SubmitButton>
    </form>
  );
}

function AddressForm({ action, address, customerId }: { action: AddressAction; address?: CustomerAddress; customerId: string }) {
  const [state, formAction] = useActionState(action, initialCustomerAddressFormState);
  const id = address?.id ?? "new";
  return (
    <form action={formAction} className="space-y-4 rounded-md border border-border p-4" noValidate>
      <input name="customerId" type="hidden" value={customerId} />
      {address ? <input name="addressId" type="hidden" value={address.id} /> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`address-label-${id}`}>Libellé <span className="text-muted-foreground">(facultatif)</span></label>
        <input aria-invalid={Boolean(state.fieldErrors?.label)} className={inputClassName} defaultValue={address?.label ?? ""} id={`address-label-${id}`} maxLength={120} name="label" placeholder="Ex. chantier, siège" type="text" />
        <FieldError message={state.fieldErrors?.label} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`address-line-1-${id}`}>Adresse</label>
        <input aria-invalid={Boolean(state.fieldErrors?.addressLine1)} className={inputClassName} defaultValue={address?.address_line_1} id={`address-line-1-${id}`} maxLength={200} name="addressLine1" required type="text" />
        <FieldError message={state.fieldErrors?.addressLine1} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`address-line-2-${id}`}>Complément d’adresse <span className="text-muted-foreground">(facultatif)</span></label>
        <input aria-invalid={Boolean(state.fieldErrors?.addressLine2)} className={inputClassName} defaultValue={address?.address_line_2 ?? ""} id={`address-line-2-${id}`} maxLength={200} name="addressLine2" type="text" />
        <FieldError message={state.fieldErrors?.addressLine2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`address-postal-code-${id}`}>Code postal</label>
          <input aria-invalid={Boolean(state.fieldErrors?.postalCode)} className={inputClassName} defaultValue={address?.postal_code} id={`address-postal-code-${id}`} maxLength={20} name="postalCode" required type="text" />
          <FieldError message={state.fieldErrors?.postalCode} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={`address-city-${id}`}>Ville</label>
          <input aria-invalid={Boolean(state.fieldErrors?.city)} className={inputClassName} defaultValue={address?.city} id={`address-city-${id}`} maxLength={120} name="city" required type="text" />
          <FieldError message={state.fieldErrors?.city} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor={`address-country-${id}`}>Code pays</label>
        <input aria-invalid={Boolean(state.fieldErrors?.countryCode)} className={inputClassName} defaultValue={address?.country_code ?? "FR"} id={`address-country-${id}`} maxLength={2} name="countryCode" required type="text" />
        <FieldError message={state.fieldErrors?.countryCode} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor={`address-primary-${id}`}>
        <input defaultChecked={address?.is_primary} id={`address-primary-${id}`} name="isPrimary" type="checkbox" /> Adresse principale
      </label>
      {state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <SubmitButton>{address ? "Modifier l’adresse" : "Ajouter une adresse"}</SubmitButton>
    </form>
  );
}

export function CustomerForm({ addressAction, contactAction, customerAction, customer }: CustomerFormProps) {
  if (!customer) return <div className="rounded-lg border border-border p-4"><CustomerIdentityForm action={customerAction} /></div>;
  return (
    <article className="space-y-6 rounded-lg border border-border p-5">
      <CustomerIdentityForm action={customerAction} customer={customer} />
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Contacts</h3>
        {customer.contacts.map((contact) => <ContactForm action={contactAction} contact={contact} customerId={customer.id} key={contact.id} />)}
        <ContactForm action={contactAction} customerId={customer.id} />
      </section>
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Adresses</h3>
        {customer.addresses.map((address) => <AddressForm action={addressAction} address={address} customerId={customer.id} key={address.id} />)}
        <AddressForm action={addressAction} customerId={customer.id} />
      </section>
    </article>
  );
}
