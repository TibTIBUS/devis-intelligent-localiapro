"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect } from "react";

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
  const [state, formAction] = useActionState(action, initialCustomerDeleteFormState);

  useEffect(() => {
    if (state.status === "success") {
      window.location.assign("/clients?supprime=1");
    }
  }, [state.status]);

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
