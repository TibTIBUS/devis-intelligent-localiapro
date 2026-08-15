"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  initialCustomerDeleteFormState,
  type CustomerDeleteFormState,
} from "@/lib/validation/customer";

type DeleteCustomerAction = (
  previousState: CustomerDeleteFormState,
  formData: FormData,
) => Promise<CustomerDeleteFormState>;

export function DeleteCustomerForm({
  action,
  customerId,
  customerName,
}: {
  action: DeleteCustomerAction;
  customerId: string;
  customerName: string;
}) {
  // En cas de succès, l'action serveur redirige elle-même vers /clients : il
  // n'y a alors plus d'état "success" à observer côté client.
  const [state, formAction] = useActionState(action, initialCustomerDeleteFormState);

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (!window.confirm(`Supprimer définitivement le client « ${customerName} » ?`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="customerId" type="hidden" value={customerId} />
      <Button className="w-full gap-2 sm:w-auto" type="submit" variant="destructive">
        <Trash2 className="size-4" />
        Supprimer le client
      </Button>
      {state.message && state.status === "error" ? (
        <p className="text-sm text-destructive" role="status">{state.message}</p>
      ) : null}
    </form>
  );
}
