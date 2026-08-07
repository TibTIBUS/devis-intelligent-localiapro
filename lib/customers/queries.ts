import type { SupabaseClient } from "@supabase/supabase-js";

export type CustomerContact = {
  email: string | null;
  id: string;
  is_primary: boolean;
  name: string | null;
  phone: string | null;
};

export type CustomerAddress = {
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  country_code: string;
  id: string;
  is_primary: boolean;
  label: string | null;
  postal_code: string;
};

export type Customer = {
  addresses: CustomerAddress[];
  contacts: CustomerContact[];
  display_name: string;
  id: string;
};

type CustomerRow = Omit<Customer, "addresses" | "contacts">;
type ContactRow = CustomerContact & { customer_id: string };
type AddressRow = CustomerAddress & { customer_id: string };

export async function getCustomers(client: SupabaseClient, organizationId: string) {
  const [customersResult, contactsResult, addressesResult] = await Promise.all([
    client
      .from("customers")
      .select("display_name, id")
      .eq("organization_id", organizationId)
      .order("display_name", { ascending: true }),
    client
      .from("customer_contacts")
      .select("customer_id, email, id, is_primary, name, phone")
      .eq("organization_id", organizationId)
      .order("is_primary", { ascending: false })
      .order("name", { ascending: true }),
    client
      .from("customer_addresses")
      .select("address_line_1, address_line_2, city, country_code, customer_id, id, is_primary, label, postal_code")
      .eq("organization_id", organizationId)
      .order("is_primary", { ascending: false })
      .order("label", { ascending: true }),
  ]);

  if (customersResult.error || contactsResult.error || addressesResult.error) {
    throw new Error("Impossible de charger les clients.");
  }

  const contactsByCustomer = new Map<string, CustomerContact[]>();
  for (const contact of contactsResult.data as ContactRow[]) {
    const contacts = contactsByCustomer.get(contact.customer_id) ?? [];
    contacts.push(contact);
    contactsByCustomer.set(contact.customer_id, contacts);
  }

  const addressesByCustomer = new Map<string, CustomerAddress[]>();
  for (const address of addressesResult.data as AddressRow[]) {
    const addresses = addressesByCustomer.get(address.customer_id) ?? [];
    addresses.push(address);
    addressesByCustomer.set(address.customer_id, addresses);
  }

  return (customersResult.data as CustomerRow[]).map((customer) => ({
    ...customer,
    addresses: addressesByCustomer.get(customer.id) ?? [],
    contacts: contactsByCustomer.get(customer.id) ?? [],
  }));
}
