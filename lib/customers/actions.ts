"use server";

import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  customerAddressSchema,
  customerContactSchema,
  customerSchema,
  getCustomerAddressFieldErrors,
  getCustomerAddressValues,
  getCustomerContactFieldErrors,
  getCustomerContactValues,
  getCustomerFieldErrors,
  getCustomerValues,
  type CustomerAddressFormState,
  type CustomerContactFormState,
  type CustomerFormState,
} from "@/lib/validation/customer";

async function getAuthenticatedOrganizationId() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData) {
    redirect("/connexion");
  }

  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) {
    redirect("/onboarding");
  }

  return { organizationId, supabase };
}

export async function saveCustomer(
  previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  void previousState;

  const parsed = customerSchema.safeParse(getCustomerValues(formData));

  if (!parsed.success) {
    return {
      fieldErrors: getCustomerFieldErrors(parsed.error),
      message: "VÃ©rifiez les informations saisies.",
      status: "error",
    };
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

    if (error || !data) {
      return {
        message: "Impossible de modifier ce client pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("customers").insert({
      display_name: parsed.data.displayName,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message: "Impossible d’enregistrer ce client pour le moment.",
        status: "error",
      };
    }
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
    return {
      fieldErrors: getCustomerContactFieldErrors(parsed.error),
      message: "VÃ©rifiez les informations saisies.",
      status: "error",
    };
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
        message:
          error?.code === "23505"
            ? "Ce client possÃ¨de dÃ©jÃ  un contact principal."
            : "Impossible de modifier ce contact pour le moment.",
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
        message:
          error.code === "23505"
            ? "Ce client possÃ¨de dÃ©jÃ  un contact principal."
            : "Impossible d’enregistrer ce contact pour le moment.",
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
    return {
      fieldErrors: getCustomerAddressFieldErrors(parsed.error),
      message: "VÃ©rifiez les informations saisies.",
      status: "error",
    };
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
        message:
          error?.code === "23505"
            ? "Ce client possÃ¨de dÃ©jÃ  une adresse principale."
            : "Impossible de modifier cette adresse pour le moment.",
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
        message:
          error.code === "23505"
            ? "Ce client possÃ¨de dÃ©jÃ  une adresse principale."
            : "Impossible d’enregistrer cette adresse pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/clients?adresse=enregistree");
}
