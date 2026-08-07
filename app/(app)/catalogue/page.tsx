import { redirect } from "next/navigation";

import { CategoryForm } from "@/components/catalog/category-form";
import { ItemForm } from "@/components/catalog/item-form";
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
    <main className="flex min-h-svh justify-center px-6 py-12">
      <section className="w-full max-w-3xl space-y-10">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Localiapro.fr</p>
          <h1 className="text-3xl font-semibold tracking-tight">Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            Préparez vos prestations. Laissez le prix vide lorsqu’il doit être défini plus tard.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ajouter une catégorie</h2>
          <CategoryForm action={saveCatalogCategory} />
        </section>

        {categories.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Catégories enregistrées</h2>
            {categories.map((category) => (
              <CategoryForm
                action={saveCatalogCategory}
                category={category}
                deleteAction={deleteCatalogCategory}
                key={category.id}
              />
            ))}
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Ajouter une prestation</h2>
          <ItemForm action={saveCatalogItem} categories={categories} />
        </section>

        {items.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Prestations enregistrées</h2>
            {items.map((item) => (
              <ItemForm
                action={saveCatalogItem}
                categories={categories}
                deleteAction={deleteCatalogItem}
                item={item}
                key={item.id}
              />
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
