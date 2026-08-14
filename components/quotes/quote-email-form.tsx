"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { initialQuoteEmailFormState, sendQuoteEmail } from "@/lib/documents/email-form-action";

function SendButton() {
  const { pending } = useFormStatus();
  return <Button className="w-full sm:w-auto" disabled={pending} type="submit"><Mail className="size-4" />{pending ? "Envoi…" : "Envoyer par e-mail"}</Button>;
}

export function QuoteEmailForm({
  contacts,
  quoteId,
}: {
  contacts: Array<{ email: string | null; id: string; is_primary: boolean; name: string | null }>;
  quoteId: string;
}) {
  const [state, action] = useActionState(sendQuoteEmail, initialQuoteEmailFormState);
  const emailContacts = contacts.filter((contact) => contact.email);

  if (!emailContacts.length) {
    return <p className="text-sm text-amber-700">Ajoutez une adresse e-mail à la fiche client pour pouvoir envoyer le devis.</p>;
  }

  const primary = emailContacts.find((contact) => contact.is_primary) ?? emailContacts[0];
  return (
    <form action={action} className="space-y-3">
      <input name="quoteId" type="hidden" value={quoteId} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="quote-email-contact">Destinataire</label>
        <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" defaultValue={primary.id} id="quote-email-contact" name="contactId">
          {emailContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name ? `${contact.name} — ` : ""}{contact.email}</option>)}
        </select>
      </div>
      <SendButton />
      {state.message ? <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}>{state.message}</p> : null}
    </form>
  );
}
