"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AiConversationMessage, AiQuoteLineProposal } from "@/lib/validation/ai";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(cents / 100);
}

function formatQuantity(milliunits: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(milliunits / 1_000);
}

export function QuoteAssistant({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [proposal, setProposal] = useState<AiQuoteLineProposal | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending || actionPending) return;

    const nextMessages: AiConversationMessage[] = [
      ...messages,
      { content, role: "user" as const },
    ].slice(-10);
    setMessages(nextMessages);
    setInput("");
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/ai/quote-assistant", {
        body: JSON.stringify({ messages: nextMessages, quoteId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        pendingAction?: AiQuoteLineProposal;
      };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Réponse invalide.");
      setProposal(data.pendingAction ?? null);
      setMessages((current) => [
        ...current,
        { content: data.message!, role: "assistant" as const },
      ].slice(-10));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’assistant est indisponible.");
    } finally {
      setPending(false);
    }
  }

  async function confirmProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal || actionPending) return;
    const formData = new FormData(event.currentTarget);
    setActionPending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/quote-actions/confirm", {
        body: JSON.stringify({
          proposal: {
            catalogItemId: proposal.catalogItemId,
            lineKind: formData.get("lineKind"),
            quantityMilliunits: proposal.quantityMilliunits,
          },
          quoteId,
          vatRate: formData.get("vatRate"),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Confirmation invalide.");
      setMessages((current) => [
        ...current,
        { content: data.message!, role: "assistant" as const },
      ].slice(-10));
      setProposal(null);
      setCanUndo(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La prestation n’a pas pu être ajoutée.");
    } finally {
      setActionPending(false);
    }
  }

  async function undoLastAction() {
    if (actionPending) return;
    setActionPending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/quote-actions/undo", {
        body: JSON.stringify({ quoteId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Annulation impossible.");
      setMessages((current) => [
        ...current,
        { content: data.message!, role: "assistant" as const },
      ].slice(-10));
      setCanUndo(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’action n’a pas pu être annulée.");
    } finally {
      setActionPending(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-5" aria-labelledby="quote-assistant-title">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold" id="quote-assistant-title">Assistant devis</h2>
        <p className="text-sm text-muted-foreground">
          Il recherche votre catalogue et prépare un ajout. Rien n’est enregistré sans votre confirmation.
        </p>
      </div>
      {messages.length > 0 ? (
        <ol className="max-h-72 space-y-3 overflow-y-auto" aria-live="polite">
          {messages.map((message, index) => (
            <li
              className={message.role === "user" ? "ml-8 rounded-lg bg-muted p-3 text-sm" : "mr-8 rounded-lg border border-border p-3 text-sm"}
              key={`${message.role}-${index}`}
            >
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {message.role === "user" ? "Vous" : "Assistant"}
              </span>
              {message.content}
            </li>
          ))}
        </ol>
      ) : null}
      {proposal ? (
        <form className="space-y-4 rounded-lg border border-primary/40 bg-muted/40 p-4" onSubmit={confirmProposal}>
          <div>
            <h3 className="font-semibold">Ajout à confirmer</h3>
            <p className="text-sm">{proposal.label}</p>
            <p className="text-sm text-muted-foreground">
              {formatQuantity(proposal.quantityMilliunits)} {proposal.unit} × {formatPrice(proposal.unitPriceHtCents)} HT
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Nature de la ligne
              <select className="w-full rounded-md border border-input bg-background px-3 py-2" defaultValue={proposal.lineKind} name="lineKind">
                <option value="labor">Main-d’œuvre</option>
                <option value="material">Matériau</option>
                <option value="travel">Déplacement</option>
                <option value="service">Prestation</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              TVA applicable (%)
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                inputMode="decimal"
                max="100"
                min="0"
                name="vatRate"
                placeholder="Ex. : 10"
                required
                step="0.01"
                type="number"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Le prix unitaire vient du catalogue. Vérifiez le taux de TVA applicable à ce chantier avant de confirmer.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={actionPending} type="submit">
              {actionPending ? "Enregistrement…" : "Confirmer l’ajout"}
            </Button>
            <Button disabled={actionPending} onClick={() => setProposal(null)} type="button" variant="outline">
              Refuser
            </Button>
          </div>
        </form>
      ) : null}
      {canUndo ? (
        <Button disabled={actionPending} onClick={undoLastAction} type="button" variant="outline">
          Annuler le dernier ajout de l’assistant
        </Button>
      ) : null}
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="quote-assistant-message">
          Votre demande
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending || actionPending}
          id="quote-assistant-message"
          maxLength={1_000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex. : cherche une prestation de plomberie dans mon catalogue"
          required
          value={input}
        />
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button disabled={pending || actionPending || input.trim().length === 0} type="submit">
          {pending ? "Analyse en cours…" : "Demander à l’assistant"}
        </Button>
      </form>
    </section>
  );
}
