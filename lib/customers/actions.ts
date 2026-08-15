"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  customerAddressSchema,
  customerAddressIdSchema,
  customerContactSchema,
  customerContactIdSchema,
  customerIdSchema,
  customerSchema,
  getCustomerAddressFieldErrors,
  getCustomerAddressValues,
  getCustomerContactFieldErrors,
  getCustomerContactValues,
  getCustomerFieldErrors,
  getCustomerValues,
  getSimpleCustomerFieldErrors,
  getSimpleCustomerValues,
  simpleCustomerSchema,
  type CustomerAddressFormState,
  type CustomerContactFormState,
  type CustomerDeleteFormState,
  type CustomerFormState,
  type SimpleCustomerFormState,
} from "@/lib/validation/customer";

async function getAuthenticatedOrganizationId() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  return { organizationId, supabase };
}

export async function saveSimpleCustomer(
  previousState: SimpleCustomerFormState,
  formData: FormData,
): Promise<SimpleCustomerFormState> {
  void previousState;

  const parsed = simpleCustomerSchema.safeParse(getSimpleCustomerValues(formData));
  if (!parsed.success) {
    return {
      fieldErrors: getSimpleCustomerFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = parsed.data;
  let customerId = values.customerId;

  if (customerId) {
    const { data, error } = await supabase
      .from("customers")
      .update({ display_name: values.displayName })
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { message: "Impossible de modifier ce client.", status: "error" };
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({ display_name: values.displayName, organization_id: organizationId })
      .select("id")
      .single();
    if (error || !data) return { message: "Impossible de créer ce client.", status: "error" };
    customerId = data.id;
  }

  const hasContact = Boolean(values.phone || values.email);
  if (hasContact) {
    const contactValues = {
      email: values.email ?? null,
      is_primary: true,
      name: values.displayName,
      phone: values.phone ?? null,
    };
    if (values.contactId) {
      const { error } = await supabase
        .from("customer_contacts")
        .update(contactValues)
        .eq("id", values.contactId)
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId);
      if (error) return { message: "Client enregistré, mais ses coordonnées n’ont pas pu être mises à jour.", status: "error" };
    } else {
      const { error } = await supabase.from("customer_contacts").insert({
        ...contactValues,
        customer_id: customerId,
        organization_id: organizationId,
      });
      if (error) return { message: "Client enregistré, mais ses coordonnées n’ont pas pu être ajoutées.", status: "error" };
    }
  }

  const hasAddress = Boolean(values.addressLine1 && values.postalCode && values.city);
  if (hasAddress) {
    const addressValues = {
      address_line_1: values.addressLine1!,
      address_line_2: null,
      city: values.city!,
      country_code: "FR",
      is_primary: true,
      label: null,
      postal_code: values.postalCode!,
    };
    if (values.addressId) {
      const { error } = await supabase
        .from("customer_addresses")
        .update(addressValues)
        .eq("id", values.addressId)
        .eq("customer_id", customerId)
        .eq("organization_id", organizationId);
      if (error) return { message: "Client enregistré, mais son adresse n’a pas pu être mise à jour.", status: "error" };
    } else {
      const { error } = await supabase.from("customer_addresses").insert({
        ...addressValues,
        customer_id: customerId,
        organization_id: organizationId,
      });
      if (error) return { message: "Client enregistré, mais son adresse n’a pas pu être ajoutée.", status: "error" };
    }
  }

  redirect(`/clients/${customerId}?enregistre=1`);
}

export async function saveCustomer(
  previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  void previousState;

  const parsed = customerSchema.safeParse(getCustomerValues(formData));
  if (!parsed.success) {
    return { fieldErrors: getCustomerFieldErrors(parsed.error), message: "Vérifiez les informations saisies.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();

  if (parsed.data.customerId) {
    const { data, error } = await supabase
      .from("customers")
      .update({ display_name: parsed.data.displayName })
      .eq("id", parsed.data.customerId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) return { message: "Impossible de modifier ce client pour le moment.", status: "error" };
  } else {
    const { error } = await supabase.from("customers").insert({
      display_name: parsed.data.displayName,
      organization_id: organizationId,
    });

    if (error) return { message: "Impossible d’enregistrer ce client pour le moment.", status: "error" };
  }

  redirect("/clients?enregistre=1");
}

export async function saveCustomerContact(
  previousState: CustomerContactFormState,
  formData: FormData,
): Promise<CustomerContactFormState> {
  void previousState;

  const parsed = customerContactSchema.safeParse(getCustomerContactValues(formData));
  if (!parsed.success) {
    return { fieldErrors: getCustomerContactFieldErrors(parsed.error), message: "Vérifiez les informations saisies.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = {
    email: parsed.data.email ?? null,
    is_primary: parsed.data.isPrimary,
    name: parsed.data.name ?? null,
    phone: parsed.data.phone ?? null,
  };

  if (parsed.data.contactId) {
    const { data, error } = await supabase
      .from("customer_contacts")
      .update(values)
      .eq("id", parsed.data.contactId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        message: error?.code === "23505" ? "Ce client possède déjà un contact principal." : "Impossible de modifier ce contact pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("customer_contacts").insert({
      ...values,
      customer_id: parsed.data.customerId,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message: error.code === "23505" ? "Ce client possède déjà un contact principal." : "Impossible d’enregistrer ce contact pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/clients?contact=enregistre");
}

export async function saveCustomerAddress(
  previousState: CustomerAddressFormState,
  formData: FormData,
): Promise<CustomerAddressFormState> {
  void previousState;

  const parsed = customerAddressSchema.safeParse(getCustomerAddressValues(formData));
  if (!parsed.success) {
    return { fieldErrors: getCustomerAddressFieldErrors(parsed.error), message: "Vérifiez les informations saisies.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = {
    address_line_1: parsed.data.addressLine1,
    address_line_2: parsed.data.addressLine2 ?? null,
    city: parsed.data.city,
    country_code: parsed.data.countryCode,
    is_primary: parsed.data.isPrimary,
    label: parsed.data.label ?? null,
    postal_code: parsed.data.postalCode,
  };

  if (parsed.data.addressId) {
    const { data, error } = await supabase
      .from("customer_addresses")
      .update(values)
      .eq("id", parsed.data.addressId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        message: error?.code === "23505" ? "Ce client possède déjà une adresse principale." : "Impossible de modifier cette adresse pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("customer_addresses").insert({
      ...values,
      customer_id: parsed.data.customerId,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message: error.code === "23505" ? "Ce client possède déjà une adresse principale." : "Impossible d’enregistrer cette adresse pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/clients?adresse=enregistree");
}

export async function deleteCustomer(
  previousState: CustomerDeleteFormState,
  formData: FormData,
): Promise<CustomerDeleteFormState> {
  void previousState;

  const customerId = customerIdSchema.safeParse(formData.get("customerId"));
  if (!customerId.success) return { message: "Impossible d'identifier ce client.", status: "error" };

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { message: "Impossible de supprimer ce client pour le moment.", status: "error" };

  // Une redirection serveur, pas un simple retour de succès : la page
  // /clients/[clientId] restée affichée chercherait aussitôt ce client
  // supprimé et déclencherait elle-même un 404 avant que le navigateur
  // n'ait pu naviguer ailleurs.
  revalidatePath("/clients");
  redirect("/clients?supprime=1");
}

export async function deleteCustomerContact(
  previousState: CustomerDeleteFormState,
  formData: FormData,
): Promise<CustomerDeleteFormState> {
  void previousState;

  const contactId = customerContactIdSchema.safeParse(formData.get("contactId"));
  if (!contactId.success) return { message: "Impossible d'identifier ce contact.", status: "error" };

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("customer_contacts")
    .delete()
    .eq("id", contactId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { message: "Impossible de supprimer ce contact pour le moment.", status: "error" };

  revalidatePath("/clients");
  return { message: "Contact supprime.", status: "success" };
}

export async function deleteCustomerAddress(
  previousState: CustomerDeleteFormState,
  formData: FormData,
): Promise<CustomerDeleteFormState> {
  void previousState;

  const addressId = customerAddressIdSchema.safeParse(formData.get("addressId"));
  if (!addressId.success) return { message: "Impossible d'identifier cette adresse.", status: "error" };

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("customer_addresses")
    .delete()
    .eq("id", addressId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { message: "Impossible de supprimer cette adresse pour le moment.", status: "error" };

  revalidatePath("/clients");
  return { message: "Adresse supprimee.", status: "success" };
}
