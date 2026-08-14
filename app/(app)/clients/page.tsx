import Link from "next/link";
import { redirect } from "next/navigation";

import { CustomerForm } from "@/components/customers/customer-form";
import {
  deleteCustomer,
  deleteCustomerAddress,
  deleteCustomerContact,
  saveCustomer,
  saveCustomerAddress,
  saveCustomerContact,
} from "@/lib/customers/actions";
import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string | null) {
  if (!value) return "Date à définir";
  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T12:00:00`));
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; nouveau?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const params = await searchParams;
  const customers = await getCustomers(supabase, organizationId);
  const query = params.q?.trim().toLocaleLowerCase("fr-FR") ?? "";
  const filteredCustomers = query
    ? customers.filter((customer) => {
        const contactValues = customer.contacts.flatMap((contact) => [contact.name, contact.email, contact.phone]);
        return [customer.display_name, ...contactValues]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("fr-FR").includes(query));
      })
    : customers;

  const selectedCustomer = params.nouveau === "1"
    ? undefined
    : customers.find((customer) => customer.id === params.client) ?? customers[0];

  const { data: quotes, error: quotesError } = selectedCustomer
    ? await supabase
        .from("quotes")
        .select("id, issued_on, quote_number, status")
        .eq("organization_id", organizationId)
        .eq("customer_id", selectedCustomer.id)
        .order("updated_at", { ascending: false })
        .limit(5)
    : { data: [], error: null };

  if (quotesError) throw new Error("Impossible de charger les devis de ce client.");

  const totalContacts = customers.reduce((sum, customer) => sum + customer.contacts.length, 0);
  const totalAddresses = customers.reduce((sum, customer) => sum + customer.addresses.length, 0);
  const primaryContact = selectedCustomer?.contacts.find((contact) => contact.is_primary) ?? selectedCustomer?.contacts[0];
  const primaryAddress = selectedCustomer?.addresses.find((address) => address.is_primary) ?? selectedCustomer?.addresses[0];

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
            <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">Gérez vos clients et leurs coordonnées depuis un espace unique.</p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            href="/clients?nouveau=1"
          >
            + Nouveau client
          </Link>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Clients</p>
            <p className="mt-2 text-2xl font-semibold">{customers.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Enregistrés</p>
          </article>
          <article className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contacts</p>
            <p className="mt-2 text-2xl font-semibold">{totalContacts}</p>
            <p className="mt-1 text-xs text-muted-foreground">Coordonnées enregistrées</p>
          </article>
          <article className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Adresses</p>
            <p className="mt-2 text-2xl font-semibold">{totalAddresses}</p>
            <p className="mt-1 text-xs text-muted-foreground">Chantiers et adresses client</p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="rounded-xl border border-border bg-background p-4 shadow-sm">
            <form className="mb-4" method="get">
              <label className="sr-only" htmlFor="client-search">Rechercher un client</label>
              <input
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                defaultValue={params.q ?? ""}
                id="client-search"
                name="q"
                placeholder="Rechercher un client…"
                type="search"
              />
            </form>

            <div className="space-y-2">
              {filteredCustomers.length ? filteredCustomers.map((customer) => {
                const contact = customer.contacts.find((item) => item.is_primary) ?? customer.contacts[0];
                const isSelected = selectedCustomer?.id === customer.id && params.nouveau !== "1";
                return (
                  <Link
                    className={`block rounded-lg border p-3 transition ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-transparent hover:border-border hover:bg-muted/40"
                    }`}
                    href={`/clients?client=${customer.id}`}
                    key={customer.id}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                        {initials(customer.display_name) || "CL"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{customer.display_name}</p>
                          <span className="text-muted-foreground">›</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{contact?.email ?? "Aucun e-mail"}</p>
                        <p className="truncate text-xs text-muted-foreground">{contact?.phone ?? "Aucun téléphone"}</p>
                      </div>
                    </div>
                  </Link>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucun client trouvé.
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-xl border border-border bg-background shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{params.nouveau === "1" ? "Nouveau client" : "Informations client"}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {params.nouveau === "1" ? "Créez la fiche, puis ajoutez ses coordonnées." : "Modifiez la fiche et les coordonnées enregistrées."}
                  </p>
                </div>
                {selectedCustomer && params.nouveau !== "1" ? (
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold">
                    {initials(selectedCustomer.display_name) || "CL"}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-5">
              <CustomerForm
                addressAction={saveCustomerAddress}
                contactAction={saveCustomerContact}
                customer={params.nouveau === "1" ? undefined : selectedCustomer}
                customerAction={saveCustomer}
                deleteAddressAction={deleteCustomerAddress}
                deleteContactAction={deleteCustomerContact}
                deleteCustomerAction={deleteCustomer}
              />
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <h2 className="text-base font-semibold">Résumé</h2>
              {selectedCustomer && params.nouveau !== "1" ? (
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact principal</p>
                    <p className="mt-1 font-medium">{primaryContact?.name ?? selectedCustomer.display_name}</p>
                    <p className="text-muted-foreground">{primaryContact?.email ?? "E-mail non renseigné"}</p>
                    <p className="text-muted-foreground">{primaryContact?.phone ?? "Téléphone non renseigné"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Adresse principale</p>
                    {primaryAddress ? (
                      <p className="mt-1 leading-6 text-muted-foreground">
                        {primaryAddress.address_line_1}<br />
                        {primaryAddress.address_line_2 ? <>{primaryAddress.address_line_2}<br /></> : null}
                        {primaryAddress.postal_code} {primaryAddress.city}
                      </p>
                    ) : <p className="mt-1 text-muted-foreground">Aucune adresse enregistrée.</p>}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Le résumé apparaîtra après création du client.</p>
              )}
            </section>

            <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Derniers devis</h2>
                {selectedCustomer ? <Link className="text-xs font-medium text-primary hover:underline" href="/devis">Voir tous</Link> : null}
              </div>
              <div className="mt-4 space-y-2">
                {quotes?.length ? quotes.map((quote) => (
                  <Link
                    className="block rounded-lg border border-border p-3 transition hover:bg-muted/40"
                    href={`/devis/${quote.id}`}
                    key={quote.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{quote.quote_number ?? "Devis brouillon"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(quote.issued_on)}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${quote.status === "finalized" ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {quote.status === "finalized" ? "Finalisé" : "Brouillon"}
                      </span>
                    </div>
                  </Link>
                )) : (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    {selectedCustomer ? "Aucun devis pour ce client." : "Sélectionnez un client."}
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
