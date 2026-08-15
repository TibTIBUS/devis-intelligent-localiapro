import { ArrowLeft, FileText, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SimpleCustomerForm } from "@/components/customers/simple-customer-form";
import { saveSimpleCustomer } from "@/lib/customers/actions";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const customers = await getCustomers(supabase, organizationId);
  const customer = customers.find((item) => item.id === clientId);
  if (!customer) notFound();

  const primaryAddress = customer.addresses.find((item) => item.is_primary) ?? customer.addresses[0];
  const extraAddresses = customer.addresses.filter((item) => item.id !== primaryAddress?.id);

  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, issued_on, quote_number, status")
    .eq("organization_id", organizationId)
    .eq("customer_id", customer.id)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("Impossible de charger les devis de ce client.");

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-[#17382D]" href="/clients">
              <ArrowLeft className="size-4" /> Retour aux clients
            </Link>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">CLIENT</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#17382D]">{customer.display_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Modifiez les informations utiles, puis enregistrez.</p>
            </div>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#17382D] px-4 text-sm font-semibold text-[#F5F1E8]" href="/devis/nouveau">
            <Plus className="size-4" /> Nouveau devis
          </Link>
        </header>

        <SimpleCustomerForm action={saveSimpleCustomer} customer={customer} />

        {extraAddresses.length ? (
          <details className="rounded-2xl border border-border bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[#17382D] [&::-webkit-details-marker]:hidden">
              Autres adresses ({extraAddresses.length}) <span className="ml-1 text-[#E8672E]">›</span>
            </summary>
            <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 sm:p-5">
              {extraAddresses.map((address) => (
                <article className="rounded-xl border border-border p-4" key={address.id}>
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#E8672E]" />
                    <div className="text-sm">
                      {address.label ? <p className="font-semibold">{address.label}</p> : null}
                      <p className="leading-6 text-muted-foreground">{address.address_line_1}<br />{address.postal_code} {address.city}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ) : null}

        <section className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#17382D]">Derniers devis</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Les derniers devis liés à ce client.</p>
            </div>
            <FileText className="size-5 text-[#E8672E]" />
          </div>
          <div className="divide-y divide-border">
            {quotes?.length ? quotes.map((quote) => (
              <Link className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#ECE7DD]/50" href={`/devis/${quote.id}`} key={quote.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{quote.quote_number ?? "Devis brouillon"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(quote.issued_on)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${quote.status === "finalized" ? "bg-[#E7F1EB] text-[#397255]" : "bg-[#ECE7DD] text-[#626A64]"}`}>
                  {quote.status === "finalized" ? "Finalisé" : "Brouillon"}
                </span>
              </Link>
            )) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun devis pour ce client.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
