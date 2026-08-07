import { redirect } from "next/navigation";

import { CustomerForm } from "@/components/customers/customer-form";
import { saveCustomer, saveCustomerAddress, saveCustomerContact } from "@/lib/customers/actions";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const customers = await getCustomers(supabase, organizationId);
  return (
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-3xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Enregistrez vos clients et leurs coordonnées pour préparer vos futurs devis.</p>
        </div>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ajouter un client</h2>
          <CustomerForm addressAction={saveCustomerAddress} contactAction={saveCustomerContact} customerAction={saveCustomer} />
        </section>
        {customers.length ? <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Clients enregistrés</h2>
          {customers.map((customer) => <CustomerForm addressAction={saveCustomerAddress} contactAction={saveCustomerContact} customer={customer} customerAction={saveCustomer} key={customer.id} />)}
        </section> : null}
      </section>
    </main>
  );
}
