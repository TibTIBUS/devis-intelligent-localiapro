"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AiConversationMessage } from "@/lib/validation/ai";

export function QuoteAssistant({ quoteId }: { quoteId: string }) {
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending) return;

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
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Réponse invalide.");
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

  return (
    <section className="space-y-4 rounded-lg border border-border p-5" aria-labelledby="quote-assistant-title">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold" id="quote-assistant-title">Assistant devis</h2>
        <p className="text-sm text-muted-foreground">
          Il peut rechercher votre catalogue et vous guider. Ce premier socle ne modifie pas encore le devis.
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
      <form className="space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium" htmlFor="quote-assistant-message">
          Votre demande
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
          id="quote-assistant-message"
          maxLength={1_000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex. : cherche une prestation de plomberie dans mon catalogue"
          required
          value={input}
        />
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button disabled={pending || input.trim().length === 0} type="submit">
          {pending ? "Analyse en cours…" : "Demander à l’assistant"}
        </Button>
      </form>
    </section>
  );
}
