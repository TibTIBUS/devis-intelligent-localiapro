"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import {
  catalogCategoryIdSchema,
  catalogCategorySchema,
  catalogItemIdSchema,
  catalogItemSchema,
  getCatalogCategoryFieldErrors,
  getCatalogCategoryValues,
  getCatalogItemFieldErrors,
  getCatalogItemValues,
  type CatalogCategoryFormState,
  type CatalogDeleteFormState,
  type CatalogItemFormState,
} from "@/lib/validation/catalog";

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

export async function saveCatalogCategory(
  previousState: CatalogCategoryFormState,
  formData: FormData,
): Promise<CatalogCategoryFormState> {
  void previousState;

  const parsed = catalogCategorySchema.safeParse(getCatalogCategoryValues(formData));

  if (!parsed.success) {
    return {
      fieldErrors: getCatalogCategoryFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = {
    description: parsed.data.description ?? null,
    name: parsed.data.name,
  };

  if (parsed.data.categoryId) {
    const { data, error } = await supabase
      .from("catalog_categories")
      .update(values)
      .eq("id", parsed.data.categoryId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        message: "Impossible de modifier cette catégorie pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("catalog_categories").insert({
      ...values,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message: "Impossible d’enregistrer cette catégorie pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/catalogue?categorie=enregistree");
}

export async function saveCatalogItem(
  previousState: CatalogItemFormState,
  formData: FormData,
): Promise<CatalogItemFormState> {
  void previousState;

  const parsed = catalogItemSchema.safeParse(getCatalogItemValues(formData));

  if (!parsed.success) {
    return {
      fieldErrors: getCatalogItemFieldErrors(parsed.error),
      message: "Vérifiez les informations saisies.",
      status: "error",
    };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const values = {
    category_id: parsed.data.categoryId ?? null,
    description: parsed.data.description ?? null,
    name: parsed.data.name,
    unit: parsed.data.unit,
    unit_price_ht_cents: parsed.data.unitPriceHtCents ?? null,
  };

  if (parsed.data.itemId) {
    const { data, error } = await supabase
      .from("catalog_items")
      .update(values)
      .eq("id", parsed.data.itemId)
      .eq("organization_id", organizationId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        message: "Impossible de modifier cette prestation pour le moment.",
        status: "error",
      };
    }
  } else {
    const { error } = await supabase.from("catalog_items").insert({
      ...values,
      organization_id: organizationId,
    });

    if (error) {
      return {
        message: "Impossible d’enregistrer cette prestation pour le moment.",
        status: "error",
      };
    }
  }

  redirect("/catalogue?prestation=enregistree");
}

export async function deleteCatalogCategory(
  previousState: CatalogDeleteFormState,
  formData: FormData,
): Promise<CatalogDeleteFormState> {
  void previousState;

  const categoryId = catalogCategoryIdSchema.safeParse(formData.get("categoryId"));

  if (!categoryId.success) {
    return { message: "Impossible d’identifier cette catégorie.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("catalog_categories")
    .delete()
    .eq("id", categoryId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message:
        error?.code === "23503"
          ? "Cette catégorie contient encore des prestations."
          : "Impossible de supprimer cette catégorie pour le moment.",
      status: "error",
    };
  }

  revalidatePath("/catalogue");
  return { message: "Catégorie supprimée.", status: "success" };
}

export async function deleteCatalogItem(
  previousState: CatalogDeleteFormState,
  formData: FormData,
): Promise<CatalogDeleteFormState> {
  void previousState;

  const itemId = catalogItemIdSchema.safeParse(formData.get("itemId"));

  if (!itemId.success) {
    return { message: "Impossible d’identifier cette prestation.", status: "error" };
  }

  const { organizationId, supabase } = await getAuthenticatedOrganizationId();
  const { data, error } = await supabase
    .from("catalog_items")
    .delete()
    .eq("id", itemId.data)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message: "Impossible de supprimer cette prestation pour le moment.",
      status: "error",
    };
  }

  revalidatePath("/catalogue");
  return { message: "Prestation supprimée.", status: "success" };
}
