import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateQuoteForm } from "@/components/quotes/quote-forms";
import { createQuote } from "@/lib/quotes/actions";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function NewQuotePage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");
  const customers = await getCustomers(supabase, organizationId);

  return (
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-xl space-y-8">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Nouveau devis</h1>
          <p className="text-sm text-muted-foreground">Commencez par choisir le client concerné. Le devis sera ensuite enregistré à chaque modification.</p>
        </div>
        {customers.length ? <CreateQuoteForm action={createQuote} customers={customers} /> : <div className="space-y-3 rounded-lg border border-border p-5"><p className="text-sm text-muted-foreground">Créez d’abord un client pour pouvoir ouvrir un devis.</p><Link className="text-sm font-medium underline" href="/clients">Gérer les clients</Link></div>}
      </section>
    </main>
  );
}
