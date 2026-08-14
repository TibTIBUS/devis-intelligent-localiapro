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

  if (!organizationId) {
    redirect("/onboarding");
  }

  const [categories, items] = await Promise.all([
    getCatalogCategories(supabase, organizationId),
    getCatalogItems(supabase, organizationId),
  ]);

  return (
    <main className="min-h-svh px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto w-full max-w-[1500px]">
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
