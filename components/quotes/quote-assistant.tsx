"use client";

import { FormEvent, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildConfirmActionPayload } from "@/lib/ai/build-confirm-payload";
import type { AiConversationMessage, AiQuoteActionProposal } from "@/lib/validation/ai";

const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function microphoneErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) return "Impossible d’accéder au microphone.";
  if (error.name === "NotAllowedError") return "Autorisez le microphone dans les réglages du navigateur puis réessayez.";
  if (error.name === "NotFoundError") return "Aucun microphone n’a été détecté sur cet appareil.";
  if (error.name === "NotReadableError") return "Le microphone est indisponible ou déjà utilisé par une autre application.";
  return "Impossible d’accéder au microphone.";
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(cents / 100);
}

function formatQuantity(milliunits: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(milliunits / 1_000);
}

function formatRate(basisPoints: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(basisPoints / 100);
}

const lineKindLabels = {
  labor: "Main-d’œuvre",
  material: "Matériau",
  other: "Autre",
  service: "Prestation",
  travel: "Déplacement",
} as const;

function proposalTitle(proposal: AiQuoteActionProposal) {
  if (proposal.actionType === "add_quote_line") return "Ajout à confirmer";
  if (proposal.actionType === "update_quote_line") return "Modification à confirmer";
  if (proposal.actionType === "delete_quote_line") return "Suppression à confirmer";
  if (proposal.actionType === "finalize_quote") return "Finalisation à confirmer";
  if (proposal.actionType === "send_quote_email") return "Envoi par e-mail à confirmer";
  return "Paramètre du devis à confirmer";
}

function proposalDescription(proposal: AiQuoteActionProposal) {
  if ("label" in proposal) return proposal.label;
  if (proposal.actionType === "set_payment_terms") return proposal.paymentTerms;
  if (proposal.actionType === "set_validity") return `Valide jusqu’au ${proposal.validUntil}`;
  if (proposal.actionType === "set_worksite_address") return proposal.addressLabel;
  if (proposal.actionType === "set_discount") return `Remise : ${formatRate(proposal.currentRateBasisPoints)} % → ${formatRate(proposal.rateBasisPoints)} %`;
  if (proposal.actionType === "set_deposit") return `Acompte : ${formatRate(proposal.currentRateBasisPoints)} % → ${formatRate(proposal.rateBasisPoints)} %`;
  if (proposal.actionType === "finalize_quote") return "Le devis sera figé et numéroté. Cette action est irréversible.";
  if (proposal.actionType === "send_quote_email") return `Destinataire : ${proposal.contactLabel}`;
  return proposal.note;
}

export function QuoteAssistant({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [proposal, setProposal] = useState<AiQuoteActionProposal | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending || actionPending || isDictating || isTranscribing) return;

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
        pendingAction?: AiQuoteActionProposal;
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
      const payload = buildConfirmActionPayload(proposal, quoteId, {
        lineKind: formData.get("lineKind")?.toString(),
        vatRate: formData.get("vatRate")?.toString(),
      });
      const response = await fetch("/api/ai/quote-actions/confirm", {
        body: JSON.stringify(payload),
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
      setError(caught instanceof Error ? caught.message : "L’action n’a pas pu être appliquée.");
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

  async function startDictation() {
    if (pending || actionPending || isDictating || isTranscribing) return;
    setError("");
    try {
      if (!streamRef.current || streamRef.current.getAudioTracks().every((track) => track.readyState === "ended")) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        setIsDictating(false);
        setIsTranscribing(true);
        try {
          const response = await fetch("/api/ai/voice/transcribe", {
            body: blob,
            headers: { "Content-Type": blob.type || "audio/webm" },
            method: "POST",
          });
          const data = (await response.json()) as { error?: string; transcript?: string };
          if (!response.ok || !data.transcript) throw new Error(data.error ?? "La dictée n’a pas pu être transcrite.");
          setInput((current) => current.trim() ? `${current.trim()} ${data.transcript}` : data.transcript!);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "La dictée n’a pas pu être transcrite.");
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsDictating(true);
    } catch (caught) {
      setError(microphoneErrorMessage(caught));
    }
  }

  function stopDictation() {
    if (!isDictating || !recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-5" aria-labelledby="quote-assistant-title">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold" id="quote-assistant-title">Assistant devis</h2>
        <p className="text-sm text-muted-foreground">
          Il prépare les lignes et paramètres du devis. Rien n’est enregistré sans votre confirmation.
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
            <h3 className="font-semibold">{proposalTitle(proposal)}</h3>
            <p className="whitespace-pre-wrap text-sm">{proposalDescription(proposal)}</p>
            {proposal.actionType === "add_quote_line" || proposal.actionType === "update_quote_line" || proposal.actionType === "delete_quote_line" ? <p className="text-sm text-muted-foreground">
              {proposal.actionType === "update_quote_line"
                ? `${formatQuantity(proposal.currentQuantityMilliunits)} → ${formatQuantity(proposal.quantityMilliunits)} ${proposal.unit}`
                : `${formatQuantity(proposal.quantityMilliunits)} ${proposal.unit}`}
              {proposal.actionType === "add_quote_line" ? ` × ${formatPrice(proposal.unitPriceHtCents)} HT` : ""}
            </p> : null}
            {proposal.actionType === "update_quote_line" ? (
              <p className="text-sm text-muted-foreground">
                Nature : {lineKindLabels[proposal.currentLineKind]} → {lineKindLabels[proposal.lineKind]}
              </p>
            ) : null}
          </div>
          {proposal.actionType === "add_quote_line" ? (
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
                <input className="w-full rounded-md border border-input bg-background px-3 py-2" inputMode="decimal" max="100" min="0" name="vatRate" placeholder="Ex. : 10" required step="0.01" type="number" />
              </label>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {proposal.actionType === "add_quote_line"
              ? "Le prix unitaire vient du catalogue. Vérifiez le taux de TVA applicable à ce chantier avant de confirmer."
              : proposal.actionType === "update_quote_line"
                ? "Seules la quantité et la nature indiquées seront modifiées. Le prix et la TVA restent inchangés."
                : proposal.actionType === "delete_quote_line"
                  ? "La ligne sera retirée du devis. Vous pourrez annuler immédiatement cette action."
                  : proposal.actionType === "set_discount" || proposal.actionType === "set_deposit"
                    ? "Seul le taux affiché sera enregistré. Le moteur métier recalculera les montants après confirmation."
                    : "Cette valeur a été reprise de votre demande. Vérifiez-la avant de confirmer ; aucune clause n’est ajoutée automatiquement."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={actionPending} type="submit">
              {actionPending
                ? "Enregistrement…"
                : proposal.actionType === "add_quote_line"
                  ? "Confirmer l’ajout"
                  : proposal.actionType === "update_quote_line"
                    ? "Confirmer la modification"
                    : proposal.actionType === "delete_quote_line"
                      ? "Confirmer la suppression"
                      : "Confirmer ce paramètre"}
            </Button>
            <Button disabled={actionPending} onClick={() => setProposal(null)} type="button" variant="outline">Refuser</Button>
          </div>
        </form>
      ) : null}
      {canUndo ? (
        <Button disabled={actionPending} onClick={undoLastAction} type="button" variant="outline">
          Annuler la dernière action de l’assistant
        </Button>
      ) : null}
      <form className="space-y-3" onSubmit={submit}>
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium" htmlFor="quote-assistant-message">Votre demande</label>
          <Button
            aria-label={isDictating ? "Arrêter la dictée" : "Dicter votre demande"}
            className="h-8 gap-1.5 px-2.5"
            disabled={pending || actionPending || isTranscribing}
            onClick={isDictating ? stopDictation : () => void startDictation()}
            type="button"
            variant="outline"
          >
            {isDictating ? <Square className="size-3.5" /> : <Mic className="size-4" />}
            <span className="text-xs">{isTranscribing ? "Transcription…" : isDictating ? "Arrêter" : "Dicter"}</span>
          </Button>
        </div>
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
        {isDictating ? <p className="text-xs font-medium text-red-600">Micro ouvert : parlez, puis cliquez sur « Arrêter ».</p> : null}
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button disabled={pending || actionPending || isDictating || isTranscribing || input.trim().length === 0} type="submit">
          {pending ? "Analyse en cours…" : "Demander à l’assistant"}
        </Button>
      </form>
    </section>
  );
}
