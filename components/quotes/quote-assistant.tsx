"use client";

import { FormEvent, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AiConversationMessage } from "@/lib/validation/ai";

const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function microphoneErrorMessage(error: unknown) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "Le microphone n’est pas disponible dans ce navigateur.";
  }
  if (!(error instanceof DOMException)) return "Impossible d’accéder au microphone.";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Autorisez le microphone pour ce site dans les réglages du navigateur puis réessayez.";
  }
  if (error.name === "NotFoundError") return "Aucun microphone n’a été détecté sur cet appareil.";
  if (error.name === "NotReadableError" || error.name === "AbortError") {
    return "Le microphone est indisponible ou déjà utilisé par une autre application.";
  }
  return "Impossible d’accéder au microphone.";
}

export function QuoteAssistant({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<AiConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || pending || isDictating || isTranscribing) return;

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
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’assistant est indisponible.");
    } finally {
      setPending(false);
    }
  }

  async function startDictation() {
    if (pending || isDictating || isTranscribing) return;
    setError("");

    try {
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone unavailable");
      }

      let stream = streamRef.current;
      const track = stream?.getAudioTracks()[0];
      if (!stream || !track || track.readyState !== "live") {
        stream?.getTracks().forEach((item) => item.stop());
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
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
          if (!response.ok || !data.transcript) {
            throw new Error(data.error ?? "La dictée n’a pas pu être transcrite.");
          }
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
    const recorder = recorderRef.current;
    if (!isDictating || !recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  return (
    <section className="space-y-4 rounded-lg border border-border p-5" aria-labelledby="quote-assistant-title">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold" id="quote-assistant-title">Assistant devis</h2>
        <p className="text-sm text-muted-foreground">
          Décrivez les modifications à apporter au devis. La dictée remplit uniquement le champ texte avant envoi.
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
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium" htmlFor="quote-assistant-message">Votre demande</label>
          <Button
            aria-label={isDictating ? "Arrêter la dictée" : "Dicter votre demande"}
            className="h-8 gap-1.5 px-2.5"
            disabled={pending || isTranscribing}
            onClick={isDictating ? stopDictation : () => void startDictation()}
            type="button"
            variant="outline"
          >
            {isDictating ? <Square className="size-3.5" /> : <Mic className="size-3.5" />}
            {isTranscribing ? "Transcription…" : isDictating ? "Arrêter" : "Dicter"}
          </Button>
        </div>

        <textarea
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={pending}
          id="quote-assistant-message"
          maxLength={2_000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ex. : ajoute 4 prises et mets un acompte de 20 %"
          value={input}
        />

        {error ? <p aria-live="assertive" className="text-sm text-destructive" role="alert">{error}</p> : null}

        <Button disabled={pending || isDictating || isTranscribing || !input.trim()} type="submit">
          {pending ? "Traitement…" : "Demander à l’assistant"}
        </Button>
      </form>
    </section>
  );
}
