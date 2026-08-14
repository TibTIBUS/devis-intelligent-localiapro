import { redirect } from "next/navigation";

import { CatalogWorkspace } from "@/components/catalog/catalog-workspace";
import {
  deleteCatalogCategory,
  deleteCatalogItem,
  saveCatalogCategory,
  saveCatalogItem,
} from "@/lib/catalog/actions";
import { getCatalogCategories, getCatalogItems } from "@/lib/catalog/queries";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export default async function CatalogPage() {
  const supabase = await createClient();
  const organizationId = await getCurrentOrganizationId(supabase);

  if (!organizationId) redirect("/onboarding");

  const [categories, items] = await Promise.all([
    getCatalogCategories(supabase, organizationId),
    getCatalogItems(supabase, organizationId),
  ]);

  return (
    <main className="min-h-svh bg-[#F5F1E8] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto w-full max-w-[1500px]">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#E8672E]">NALTO</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-primary">Catalogue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos prestations, vos catégories et vos tarifs de référence.</p>
        </div>
        <CatalogWorkspace
          categories={categories}
          categoryAction={saveCatalogCategory}
          deleteCategoryAction={deleteCatalogCategory}
          deleteItemAction={deleteCatalogItem}
          itemAction={saveCatalogItem}
          items={items}
        />
      </section>
    </main>
  );
}
