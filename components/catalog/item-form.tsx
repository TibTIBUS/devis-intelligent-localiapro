"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { CatalogCategory, CatalogItem } from "@/lib/catalog/queries";
import {
  formatUnitPrice,
  initialCatalogDeleteFormState,
  initialCatalogItemFormState,
  type CatalogDeleteFormState,
  type CatalogItemFormState,
} from "@/lib/validation/catalog";

type ItemAction = (
  previousState: CatalogItemFormState,
  formData: FormData,
) => Promise<CatalogItemFormState>;

type DeleteItemAction = (
  previousState: CatalogDeleteFormState,
  formData: FormData,
) => Promise<CatalogDeleteFormState>;

type ItemFormProps = {
  action: ItemAction;
  categories: CatalogCategory[];
  deleteAction?: DeleteItemAction;
  item?: CatalogItem;
};

const inputClassName =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
const textAreaClassName =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full sm:w-auto" disabled={pending} type="submit">
      {pending
        ? "Enregistrement en cours…"
        : isEditing
          ? "Enregistrer les modifications"
          : "Ajouter la prestation"}
    </Button>
  );
}

function DeleteItemForm({ action, itemId }: { action: DeleteItemAction; itemId: string }) {
  const [state, formAction] = useActionState(action, initialCatalogDeleteFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input name="itemId" type="hidden" value={itemId} />
      <Button className="w-full sm:w-auto" type="submit" variant="destructive">
        Supprimer cette prestation
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function ItemForm({ action, categories, deleteAction, item }: ItemFormProps) {
  const [state, formAction] = useActionState(action, initialCatalogItemFormState);
  const isEditing = Boolean(item);
  const id = item?.id ?? "new";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
      <form action={formAction} className="space-y-4" noValidate>
        {item ? <input name="itemId" type="hidden" value={item.id} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`item-name-${id}`}>
              Prestation
            </label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className={inputClassName}
              defaultValue={item?.name}
              id={`item-name-${id}`}
              maxLength={200}
              name="name"
              required
              type="text"
            />
            {state.fieldErrors?.name ? <p className="text-sm text-destructive">{state.fieldErrors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`item-unit-${id}`}>Unité</label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.unit)}
              className={inputClassName}
              defaultValue={item?.unit}
              id={`item-unit-${id}`}
              maxLength={80}
              name="unit"
              placeholder="Ex. heure, unité, forfait"
              required
              type="text"
            />
            {state.fieldErrors?.unit ? <p className="text-sm text-destructive">{state.fieldErrors.unit}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`item-category-${id}`}>Catégorie <span className="text-muted-foreground">(facultatif)</span></label>
            <select aria-invalid={Boolean(state.fieldErrors?.categoryId)} className={inputClassName} defaultValue={item?.category_id ?? ""} id={`item-category-${id}`} name="categoryId">
              <option value="">Sans catégorie</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {state.fieldErrors?.categoryId ? <p className="text-sm text-destructive">{state.fieldErrors.categoryId}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`item-price-${id}`}>Prix unitaire HT (€) <span className="text-muted-foreground">(facultatif)</span></label>
            <input
              aria-invalid={Boolean(state.fieldErrors?.unitPriceHtCents)}
              className={inputClassName}
              defaultValue={formatUnitPrice(item?.unit_price_ht_cents ?? null)}
              id={`item-price-${id}`}
              inputMode="decimal"
              name="unitPriceHt"
              placeholder="Ex. 55,90"
              type="text"
            />
            {state.fieldErrors?.unitPriceHtCents ? <p className="text-sm text-destructive">{state.fieldErrors.unitPriceHtCents}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`item-description-${id}`}>Description <span className="text-muted-foreground">(facultatif)</span></label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.description)}
            className={textAreaClassName}
            defaultValue={item?.description ?? ""}
            id={`item-description-${id}`}
            maxLength={1000}
            name="description"
          />
          {state.fieldErrors?.description ? <p className="text-sm text-destructive">{state.fieldErrors.description}</p> : null}
        </div>

        {state.message ? <p aria-live="polite" className="text-sm text-destructive">{state.message}</p> : null}
        <SubmitButton isEditing={isEditing} />
      </form>
      {item && deleteAction ? <DeleteItemForm action={deleteAction} itemId={item.id} /> : null}
    </div>
  );
}
