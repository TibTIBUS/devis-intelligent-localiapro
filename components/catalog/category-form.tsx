"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import type { CatalogCategory } from "@/lib/catalog/queries";
import {
  initialCatalogCategoryFormState,
  initialCatalogDeleteFormState,
  type CatalogCategoryFormState,
  type CatalogDeleteFormState,
} from "@/lib/validation/catalog";

type CategoryAction = (
  previousState: CatalogCategoryFormState,
  formData: FormData,
) => Promise<CatalogCategoryFormState>;

type DeleteCategoryAction = (
  previousState: CatalogDeleteFormState,
  formData: FormData,
) => Promise<CatalogDeleteFormState>;

type CategoryFormProps = {
  action: CategoryAction;
  category?: CatalogCategory;
  deleteAction?: DeleteCategoryAction;
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
          : "Ajouter la catégorie"}
    </Button>
  );
}

function DeleteCategoryForm({ action, categoryId }: { action: DeleteCategoryAction; categoryId: string }) {
  const [state, formAction] = useActionState(action, initialCatalogDeleteFormState);

  return (
    <form action={formAction} className="space-y-2">
      <input name="categoryId" type="hidden" value={categoryId} />
      <Button className="w-full sm:w-auto" type="submit" variant="destructive">
        Supprimer cette catégorie
      </Button>
      {state.message ? (
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function CategoryForm({ action, category, deleteAction }: CategoryFormProps) {
  const [state, formAction] = useActionState(action, initialCatalogCategoryFormState);
  const isEditing = Boolean(category);
  const id = category?.id ?? "new";

  return (
    <div className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
      <form action={formAction} className="space-y-4" noValidate>
        {category ? <input name="categoryId" type="hidden" value={category.id} /> : null}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`category-name-${id}`}>Nom de la catégorie</label>
          <input
            aria-invalid={Boolean(state.fieldErrors?.name)}
            className={inputClassName}
            defaultValue={category?.name}
            id={`category-name-${id}`}
            maxLength={120}
            name="name"
            required
            type="text"
          />
          {state.fieldErrors?.name ? <p className="text-sm text-destructive">{state.fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor={`category-description-${id}`}>Description <span className="text-muted-foreground">(facultatif)</span></label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.description)}
            className={textAreaClassName}
            defaultValue={category?.description ?? ""}
            id={`category-description-${id}`}
            maxLength={500}
            name="description"
          />
          {state.fieldErrors?.description ? <p className="text-sm text-destructive">{state.fieldErrors.description}</p> : null}
        </div>
        {state.message ? <p aria-live="polite" className="text-sm text-destructive">{state.message}</p> : null}
        <SubmitButton isEditing={isEditing} />
      </form>
      {category && deleteAction ? <DeleteCategoryForm action={deleteAction} categoryId={category.id} /> : null}
    </div>
  );
}
