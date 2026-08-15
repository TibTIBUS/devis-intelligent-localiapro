import { Mail, MapPin, Phone, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCustomers } from "@/lib/customers/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; nouveau?: string; q?: string }>;
}) {
  const params = await searchParams;
  if (params.nouveau === "1") redirect("/clients/nouveau");
  if (params.client) redirect(`/clients/${params.client}`);

  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const customers = await getCustomers(supabase, organizationId);
  const query = params.q?.trim().toLocaleLowerCase("fr-FR") ?? "";
  const filteredCustomers = query
    ? customers.filter((customer) => {
        const contact = customer.contacts.find((item) => item.is_primary) ?? customer.contacts[0];
        return [customer.display_name, contact?.email, contact?.phone]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("fr-FR").includes(query));
      })
    : customers;

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">NALTO</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#17382D]">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">Recherchez un client ou ajoutez-en un nouveau.</p>
          </div>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#E8672E] px-5 text-sm font-semibold text-white transition hover:bg-[#D95E27]"
            href="/clients/nouveau"
          >
            + Nouveau client
          </Link>
        </header>

        <form className="relative" method="get">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <label className="sr-only" htmlFor="client-search">Rechercher un client</label>
          <input
            className="h-12 w-full rounded-xl border border-border bg-white pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-[#17382D] focus:ring-2 focus:ring-[#17382D]/10"
            defaultValue={params.q ?? ""}
            id="client-search"
            name="q"
            placeholder="Nom, téléphone ou e-mail…"
            type="search"
          />
        </form>

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {filteredCustomers.length ? (
            <div className="divide-y divide-border">
              {filteredCustomers.map((customer) => {
                const contact = customer.contacts.find((item) => item.is_primary) ?? customer.contacts[0];
                const address = customer.addresses.find((item) => item.is_primary) ?? customer.addresses[0];
                return (
                  <Link
                    className="flex items-center gap-4 px-4 py-4 transition hover:bg-[#ECE7DD]/60 sm:px-5"
                    href={`/clients/${customer.id}`}
                    key={customer.id}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ECE7DD] text-[#17382D]"><UserRound className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#18201C]">{customer.display_name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {contact?.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{contact.phone}</span> : null}
                        {contact?.email ? <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{contact.email}</span> : null}
                        {address ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{address.postal_code} {address.city}</span> : null}
                        {!contact?.phone && !contact?.email && !address ? <span>Coordonnées à compléter</span> : null}
                      </div>
                    </div>
                    <span aria-hidden="true" className="text-xl text-[#E8672E]">›</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <UserRound className="mx-auto size-9 text-muted-foreground" />
              <p className="mt-3 font-semibold text-[#17382D]">{query ? "Aucun client trouvé" : "Aucun client pour le moment"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{query ? "Essayez une autre recherche." : "Créez votre premier client en quelques secondes."}</p>
              {!query ? <Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#E8672E] px-5 text-sm font-semibold text-white" href="/clients/nouveau">Créer un client</Link> : null}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
