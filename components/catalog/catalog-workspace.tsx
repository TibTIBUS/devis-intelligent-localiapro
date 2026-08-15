"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Folder,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Tag,
  X,
} from "lucide-react";

import { CategoryForm } from "@/components/catalog/category-form";
import { ItemForm } from "@/components/catalog/item-form";
import { Button } from "@/components/ui/button";
import type { CatalogCategory, CatalogItem } from "@/lib/catalog/queries";
import type {
  CatalogCategoryFormState,
  CatalogDeleteFormState,
  CatalogItemFormState,
} from "@/lib/validation/catalog";

type CategoryAction = (previousState: CatalogCategoryFormState, formData: FormData) => Promise<CatalogCategoryFormState>;
type ItemAction = (previousState: CatalogItemFormState, formData: FormData) => Promise<CatalogItemFormState>;
type DeleteAction = (previousState: CatalogDeleteFormState, formData: FormData) => Promise<CatalogDeleteFormState>;

type EditorMode =
  | { type: "new-category" }
  | { type: "new-item" }
  | { category: CatalogCategory; type: "edit-category" }
  | { item: CatalogItem; type: "edit-item" };

function formatPrice(cents: number | null) {
  if (cents === null) return "Prix à définir";
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(cents / 100);
}

function formatAveragePrice(items: CatalogItem[]) {
  const priced = items.filter((item) => item.unit_price_ht_cents !== null);
  if (!priced.length) return "—";
  const average = priced.reduce((sum, item) => sum + (item.unit_price_ht_cents ?? 0), 0) / priced.length;
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(average / 100);
}

function formatCatalogValue(items: CatalogItem[]) {
  const total = items.reduce((sum, item) => sum + (item.unit_price_ht_cents ?? 0), 0);
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(total / 100);
}

function EditorContent({
  categoryAction,
  categories,
  deleteCategoryAction,
  deleteItemAction,
  editor,
  itemAction,
}: {
  categoryAction: CategoryAction;
  categories: CatalogCategory[];
  deleteCategoryAction: DeleteAction;
  deleteItemAction: DeleteAction;
  editor: EditorMode;
  itemAction: ItemAction;
}) {
  if (editor.type === "new-category") {
    return <div className="space-y-4"><div><h2 className="font-semibold">Nouvelle catégorie</h2><p className="text-xs text-muted-foreground">Créez un nouveau groupe de prestations.</p></div><CategoryForm action={categoryAction} /></div>;
  }
  if (editor.type === "edit-category") {
    return <div className="space-y-4"><div><h2 className="font-semibold">Modifier la catégorie</h2><p className="text-xs text-muted-foreground">Les prestations associées restent conservées.</p></div><CategoryForm action={categoryAction} category={editor.category} deleteAction={deleteCategoryAction} key={editor.category.id} /></div>;
  }
  if (editor.type === "edit-item") {
    return <div className="space-y-4"><div><h2 className="font-semibold">Modifier la prestation</h2><p className="text-xs text-muted-foreground">Les changements seront utilisés pour les prochains devis.</p></div><ItemForm action={itemAction} categories={categories} deleteAction={deleteItemAction} item={editor.item} key={editor.item.id} /></div>;
  }
  return <div className="space-y-4"><div><h2 className="font-semibold">Nouvelle prestation</h2><p className="text-xs text-muted-foreground">Ajoutez une prestation à votre catalogue.</p></div><ItemForm action={itemAction} categories={categories} /></div>;
}

export function CatalogWorkspace({
  categories,
  categoryAction,
  deleteCategoryAction,
  deleteItemAction,
  itemAction,
  items,
}: {
  categories: CatalogCategory[];
  categoryAction: CategoryAction;
  deleteCategoryAction: DeleteAction;
  deleteItemAction: DeleteAction;
  itemAction: ItemAction;
  items: CatalogItem[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorMode>({ type: "new-item" });
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [search, setSearch] = useState("");

  const openEditor = (mode: EditorMode) => {
    setEditor(mode);
    setMobileEditorOpen(true);
  };

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr-FR");
    return items.filter((item) => {
      const matchesCategory = selectedCategoryId === null || item.category_id === selectedCategoryId;
      const matchesSearch = !normalizedSearch
        || item.name.toLocaleLowerCase("fr-FR").includes(normalizedSearch)
        || (item.description ?? "").toLocaleLowerCase("fr-FR").includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [items, search, selectedCategoryId]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.category_id) continue;
      counts.set(item.category_id, (counts.get(item.category_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-2 min-[420px]:grid-cols-2 sm:flex sm:justify-end">
        <Button className="min-h-11" onClick={() => openEditor({ type: "new-category" })} type="button" variant="outline"><Plus className="size-4" /> Nouvelle catégorie</Button>
        <Button className="min-h-11" onClick={() => openEditor({ type: "new-item" })} type="button"><PackagePlus className="size-4" /> Ajouter une prestation</Button>
      </div>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4" aria-label="Résumé du catalogue">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"><div className="flex items-center gap-2.5 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ECE7DD] text-[#17382D] sm:size-10"><Folder className="size-4 sm:size-5" /></span><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-xs">Catégories</p><p className="text-xl font-semibold sm:text-2xl">{categories.length}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"><div className="flex items-center gap-2.5 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#E7EFE8] text-[#397255] sm:size-10"><Tag className="size-4 sm:size-5" /></span><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-xs">Prestations</p><p className="text-xl font-semibold sm:text-2xl">{items.length}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"><div className="flex items-center gap-2.5 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#F3E4D9] text-[#E8672E] sm:size-10"><Tag className="size-4 sm:size-5" /></span><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-xs">Prix moyen HT</p><p className="truncate text-base font-semibold sm:text-xl">{formatAveragePrice(items)}</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4"><div className="flex items-center gap-2.5 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ECE7DD] text-[#17382D] sm:size-10"><BarChart3 className="size-4 sm:size-5" /></span><div className="min-w-0"><p className="text-[11px] text-muted-foreground sm:text-xs">Valeur catalogue</p><p className="truncate text-base font-semibold sm:text-xl">{formatCatalogValue(items)}</p></div></div></div>
      </section>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm xl:hidden">
        <label className="mb-2 block text-sm font-medium" htmlFor="catalog-category-filter">Catégorie</label>
        <div className="flex gap-2">
          <select
            className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            id="catalog-category-filter"
            onChange={(event) => setSelectedCategoryId(event.target.value || null)}
            value={selectedCategoryId ?? ""}
          >
            <option value="">Toutes les prestations ({items.length})</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name} ({countsByCategory.get(category.id) ?? 0})</option>)}
          </select>
          {selectedCategoryId ? (
            <Button
              className="size-11 shrink-0"
              onClick={() => {
                const category = categories.find((candidate) => candidate.id === selectedCategoryId);
                if (category) openEditor({ category, type: "edit-category" });
              }}
              size="icon"
              type="button"
              variant="outline"
              aria-label="Modifier la catégorie sélectionnée"
            ><Pencil className="size-4" /></Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[260px_minmax(0,1fr)_360px] xl:items-start">
        <aside className="hidden rounded-xl border border-border bg-card p-4 shadow-sm xl:block">
          <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold">Catégories</h2><Button className="size-8" onClick={() => openEditor({ type: "new-category" })} size="icon" type="button" variant="ghost" aria-label="Ajouter une catégorie"><Plus className="size-4" /></Button></div>
          <div className="space-y-2">
            <button className={`w-full rounded-lg border p-3 text-left transition ${selectedCategoryId === null ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`} onClick={() => setSelectedCategoryId(null)} type="button"><p className="font-medium">Toutes</p><p className="mt-1 text-xs text-muted-foreground">{items.length} prestations</p></button>
            {categories.map((category) => (
              <div key={category.id}>
                <button className={`w-full rounded-lg border p-3 text-left transition ${selectedCategoryId === category.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`} onClick={() => setSelectedCategoryId(category.id)} type="button"><p className="truncate font-medium">{category.name}</p><p className="mt-1 text-xs text-muted-foreground">{countsByCategory.get(category.id) ?? 0} prestations</p></button>
                <button className="mt-1 flex items-center gap-1 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => openEditor({ category, type: "edit-category" })} type="button"><Pencil className="size-3" /> Modifier</button>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm min-[375px]:p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Prestations enregistrées</h2><p className="text-xs text-muted-foreground">Touchez une prestation pour la modifier.</p></div>
            <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une prestation…" type="search" value={search} /></div>
          </div>
          <div className="space-y-2">
            {visibleItems.length ? visibleItems.map((item) => (
              <button className="w-full rounded-lg border border-border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30 sm:grid sm:grid-cols-[minmax(0,1fr)_90px_120px_auto] sm:items-center sm:gap-3 sm:p-4" key={item.id} onClick={() => openEditor({ item, type: "edit-item" })} type="button">
                <div className="min-w-0"><p className="break-words font-medium sm:truncate">{item.name}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description || "Aucune description"}</p></div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 sm:mt-0 sm:block sm:border-0 sm:pt-0">
                  <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-[11px]">Unité</p><p className="text-sm font-medium">{item.unit}</p></div>
                  <div className="sm:hidden"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Prix HT</p><p className="text-sm font-semibold">{formatPrice(item.unit_price_ht_cents)}</p></div>
                </div>
                <div className="hidden sm:block"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prix HT</p><p className="text-sm font-semibold">{formatPrice(item.unit_price_ht_cents)}</p></div>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary sm:mt-0"><Pencil className="size-4" /> Modifier</span>
              </button>
            )) : <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune prestation ne correspond à cette sélection.</div>}
          </div>
        </section>

        <aside className="hidden self-start rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-24 lg:block xl:col-start-3">
          <EditorContent categoryAction={categoryAction} categories={categories} deleteCategoryAction={deleteCategoryAction} deleteItemAction={deleteItemAction} editor={editor} itemAction={itemAction} />
        </aside>
      </div>

      {mobileEditorOpen ? (
        <div className="lg:hidden">
          <button className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileEditorOpen(false)} type="button" aria-label="Fermer l’éditeur" />
          <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[88svh] overflow-y-auto rounded-t-3xl border border-border bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:rounded-3xl sm:bottom-4">
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between border-b border-border bg-background pb-3">
              <span className="mx-auto block h-1.5 w-12 rounded-full bg-muted-foreground/25 sm:hidden" />
              <Button className="absolute right-0 top-0 size-9" onClick={() => setMobileEditorOpen(false)} size="icon" type="button" variant="ghost" aria-label="Fermer"><X className="size-5" /></Button>
            </div>
            <EditorContent categoryAction={categoryAction} categories={categories} deleteCategoryAction={deleteCategoryAction} deleteItemAction={deleteItemAction} editor={editor} itemAction={itemAction} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
