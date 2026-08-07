"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { validateQuoteCompliance } from "@/lib/compliance/quote-compliance";
import { createClient } from "@/lib/supabase/server";
import {
  getQuoteCreateValues,
  getQuoteFieldErrors,
  getQuoteFinancialSettingsValues,
  getQuoteLineValues,
  getQuoteSectionValues,
  quoteCreateSchema,
  quoteFinancialSettingsSchema,
  quoteIdSchema,
  quoteLineIdSchema,
  quoteLineSchema,
  quoteSectionIdSchema,
  quoteSectionSchema,
  type QuoteFormState,
} from "@/lib/validation/quote";

async function getAuthenticatedOrganizationId() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  return { organizationId, supabase };
}

function invalidQuoteForm(error: Parameters<typeof getQuoteFieldErrors>[0]): QuoteFormState {
  return {
    fieldErrors: getQuoteFieldErrors(error),
    message: "VÃ©rifiez les informations saisies.",
    status: "error",
  };
}

function revalidateQuote(quoteId: string) {
  revalidatePath(`/devis/${quoteId}`);
  revalidatePath("/devis/nouveau");
}

export async function createQuote(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const parsed = quoteCreateSchema.safeParse(getQuoteCreateValues(formData));
  if (!parsed.success) return invalidQuoteForm(parsed.error);

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("quotes")
    .insert({ customer_id: parsed.data.customerId, organization_id: organizationId })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { message: "Impossible de crÃ©er ce devis pour le moment.", status: "error" };
  }

  redirect(`/devis/${data.id}`);
}

export async function saveQuoteFinancialSettings(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const parsed = quoteFinancialSettingsSchema.safeParse(getQuoteFinancialSettingsValues(formData));
  if (!parsed.success) return invalidQuoteForm(parsed.error);

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("quotes")
    .update({
      deposit_rate_basis_points: parsed.data.depositRateBasisPoints,
      discount_rate_basis_points: parsed.data.discountRateBasisPoints,
      is_quote_free: parsed.data.isQuoteFree,
      preparation_fee_ht_cents: parsed.data.isQuoteFree ? null : parsed.data.preparationFeeHtCents,
      preparation_fee_vat_rate_basis_points: parsed.data.isQuoteFree ? null : parsed.data.preparationFeeVatRateBasisPoints,
      travel_fee_applicable: parsed.data.travelFeeApplicable,
      valid_until: parsed.data.validUntil,
      work_address_id: parsed.data.workAddressId,
    })
    .eq("id", parsed.data.quoteId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { message: "Impossible de mettre Ã  jour les conditions du devis.", status: "error" };
  }

  revalidateQuote(parsed.data.quoteId);
  return { message: "EnregistrÃ©.", status: "success" };
}

export async function finalizeQuote(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const quoteId = quoteIdSchema.safeParse(formData.get("quoteId"));
  if (!quoteId.success) return { message: "Impossible dâ€™identifier ce devis.", status: "error" };

  const { supabase } = await getAuthenticatedOrganizationId();
  const compliance = await validateQuoteCompliance(supabase, quoteId.data);
  if (!compliance.valid) {
    return {
      message: compliance.errors.map((issue) => issue.message).join(" "),
      status: "error",
    };
  }

  const { data, error } = await supabase.rpc("finalize_quote", { p_quote_id: quoteId.data });
  if (error || !data?.[0]) {
    return {
      message: "Impossible de finaliser ce devis pour le moment. Relancez le contrôle de conformité.",
      status: "error",
    };
  }

  revalidateQuote(quoteId.data);
  revalidatePath("/devis");
  return { message: `Devis finalisÃ© sous le numÃ©ro ${data[0].quote_number}.`, status: "success" };
}

export async function saveQuoteSection(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const parsed = quoteSectionSchema.safeParse(getQuoteSectionValues(formData));
  if (!parsed.success) return invalidQuoteForm(parsed.error);

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  if (parsed.data.sectionId) {
    const { data, error } = await supabase
      .from("quote_sections")
      .update({ title: parsed.data.title })
      .eq("id", parsed.data.sectionId)
      .eq("organization_id", organizationId)
      .eq("quote_id", parsed.data.quoteId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { message: "Impossible de modifier cette section.", status: "error" };
  } else {
    const { error } = await supabase.from("quote_sections").insert({
      organization_id: organizationId,
      quote_id: parsed.data.quoteId,
      title: parsed.data.title,
    });
    if (error) return { message: "Impossible dâ€™ajouter cette section.", status: "error" };
  }

  revalidateQuote(parsed.data.quoteId);
  return { message: "EnregistrÃ©.", status: "success" };
}

export async function saveQuoteLine(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const parsed = quoteLineSchema.safeParse(getQuoteLineValues(formData));
  if (!parsed.success) return invalidQuoteForm(parsed.error);

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  let values = {
    catalog_item_id: parsed.data.catalogItemId ?? null,
    description: parsed.data.description ?? null,
    label: parsed.data.label ?? "",
    line_kind: parsed.data.lineKind,
    quantity_milliunits: parsed.data.quantityMilliunits,
    section_id: parsed.data.sectionId ?? null,
    unit: parsed.data.unit ?? "",
    unit_price_ht_cents: parsed.data.unitPriceHtCents ?? null,
    vat_rate_basis_points: parsed.data.vatRateBasisPoints ?? null,
  };

  if (parsed.data.catalogItemId && !parsed.data.lineId) {
    const { data: catalogItem, error } = await supabase
      .from("catalog_items")
      .select("description, name, unit, unit_price_ht_cents")
      .eq("id", parsed.data.catalogItemId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (error || !catalogItem) {
      return { message: "Cette prestation catalogue est introuvable.", status: "error" };
    }
    values = {
      ...values,
      description: catalogItem.description,
      label: catalogItem.name,
      unit: catalogItem.unit,
      unit_price_ht_cents: catalogItem.unit_price_ht_cents,
    };
  }

  if (parsed.data.lineId) {
    const { data, error } = await supabase
      .from("quote_lines")
      .update(values)
      .eq("id", parsed.data.lineId)
      .eq("organization_id", organizationId)
      .eq("quote_id", parsed.data.quoteId)
      .select("id")
      .maybeSingle();
    if (error || !data) return { message: "Impossible de modifier cette ligne.", status: "error" };
  } else {
    const { error } = await supabase.from("quote_lines").insert({
      ...values,
      organization_id: organizationId,
      quote_id: parsed.data.quoteId,
    });
    if (error) return { message: "Impossible dâ€™ajouter cette ligne.", status: "error" };
  }

  revalidateQuote(parsed.data.quoteId);
  return { message: "EnregistrÃ©.", status: "success" };
}

export async function deleteQuoteLine(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const quoteId = quoteIdSchema.safeParse(formData.get("quoteId"));
  const lineId = quoteLineIdSchema.safeParse(formData.get("lineId"));
  if (!quoteId.success || !lineId.success) {
    return { message: "Impossible dâ€™identifier cette ligne.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("quote_lines")
    .delete()
    .eq("id", lineId.data)
    .eq("quote_id", quoteId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (error || !data) return { message: "Impossible de supprimer cette ligne.", status: "error" };

  revalidateQuote(quoteId.data);
  return { message: "Ligne supprimÃ©e.", status: "success" };
}

export async function deleteQuoteSection(
  previousState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  void previousState;
  const quoteId = quoteIdSchema.safeParse(formData.get("quoteId"));
  const sectionId = quoteSectionIdSchema.safeParse(formData.get("sectionId"));
  if (!quoteId.success || !sectionId.success) {
    return { message: "Impossible dâ€™identifier cette section.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("quote_sections")
    .delete()
    .eq("id", sectionId.data)
    .eq("quote_id", quoteId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      message: error?.code === "23503" ? "Retirez dâ€™abord les lignes de cette section." : "Impossible de supprimer cette section.",
      status: "error",
    };
  }

  revalidateQuote(quoteId.data);
  return { message: "Section supprimÃ©e.", status: "success" };
}
