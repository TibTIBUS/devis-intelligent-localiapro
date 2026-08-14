"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildConfirmActionPayload } from "@/lib/ai/build-confirm-payload";
import { extractVoiceVatRate, matchVoiceConfirmation } from "@/lib/ai/voice-confirmation";
import type { AiConversationMessage, AiQuoteActionProposal } from "@/lib/validation/ai";

type VoiceState = "idle" | "recording" | "processing" | "speaking";

const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function readbackForProposal(proposal: AiQuoteActionProposal): string {
  if (proposal.actionType === "add_quote_line") {
    return `${proposal.label}, ${proposal.quantityMilliunits / 1_000} ${proposal.unit}. Dites oui et le taux de TVA, par exemple : oui, dix pour cent. Ou dites non.`;
  }
  return "Dites oui pour confirmer, ou non pour annuler.";
}

export function VoiceQuoteAssistant({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcriptLog, setTranscriptLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<AiQuoteActionProposal | null>(null);
  const messagesRef = useRef<AiConversationMessage[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function logLine(line: string) {
    setTranscriptLog((current) => [...current, line].slice(-8));
  }

  async function speak(text: string) {
    setState("speaking");
    try {
      const response = await fetch("/api/ai/voice/speak", {
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) return;
      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
    } finally {
      setState("idle");
    }
  }

  async function transcribe(blob: Blob): Promise<string | null> {
    const response = await fetch("/api/ai/voice/transcribe", {
      body: blob,
      headers: { "Content-Type": blob.type || "audio/webm" },
      method: "POST",
    });
    const data = (await response.json()) as { error?: string; transcript?: string };
    if (!response.ok || !data.transcript) {
      setError(data.error ?? "Je n’ai pas compris.");
      return null;
    }
    return data.transcript;
  }

  async function handleConfirmationTurn(transcript: string) {
    const currentProposal = proposal;
    if (!currentProposal) return;

    if (currentProposal.actionType === "add_quote_line") {
      const decision = matchVoiceConfirmation(transcript);
      if (decision === "cancel") {
        setProposal(null);
        logLine("Assistant : proposition annulée.");
        await speak("D’accord, j’annule cette ligne.");
        return;
      }
      const vatRate = extractVoiceVatRate(transcript);
      if (decision !== "confirm" || !vatRate) {
        await speak("Merci de redire : je confirme, puis le taux de TVA. Par exemple : je confirme, dix pour cent.");
        return;
      }
      await confirmProposal(currentProposal, { vatRate });
      return;
    }

    const decision = matchVoiceConfirmation(transcript);
    if (decision === "confirm") {
      await confirmProposal(currentProposal);
      return;
    }
    if (decision === "cancel") {
      setProposal(null);
      logLine("Assistant : proposition annulée.");
      await speak("D’accord, j’annule.");
      return;
    }
    await speak("Je n’ai pas compris. Dites : je confirme. Ou : j’annule.");
  }

  async function confirmProposal(currentProposal: AiQuoteActionProposal, overrides?: { vatRate?: string }) {
    setState("processing");
    setError("");
    try {
      const payload = buildConfirmActionPayload(currentProposal, quoteId, overrides);
      const response = await fetch("/api/ai/quote-actions/confirm", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Confirmation invalide.");
      setProposal(null);
      logLine(`Assistant : ${data.message}`);
      router.refresh();
      await speak(data.message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "L’action n’a pas pu être appliquée.";
      setError(message);
      await speak(message);
    }
  }

  async function handleAssistantTurn(transcript: string) {
    const nextMessages: AiConversationMessage[] = [...messagesRef.current, { content: transcript, role: "user" as const }].slice(-10);
    messagesRef.current = nextMessages;
    logLine(`Vous : ${transcript}`);
    setState("processing");
    setError("");

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
      messagesRef.current = [...nextMessages, { content: data.message, role: "assistant" as const }].slice(-10);
      logLine(`Assistant : ${data.message}`);

      if (data.pendingAction) {
        setProposal(data.pendingAction);
        await speak(`${data.message} ${readbackForProposal(data.pendingAction)}`);
      } else {
        setProposal(null);
        await speak(data.message);
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "L’assistant est indisponible.";
      setError(message);
      await speak(message);
    }
  }

  async function startRecording() {
    if (state !== "idle") return;
    setError("");
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");
    } catch {
      setError("Impossible d’accéder au microphone.");
    }
  }

  function stopRecording() {
    if (state !== "recording" || !recorderRef.current) return;
    const recorder = recorderRef.current;
    const mimeType = recorder.mimeType;
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      setState("processing");
      const transcript = await transcribe(blob);
      if (!transcript) {
        setState("idle");
        return;
      }
      if (proposal) {
        await handleConfirmationTurn(transcript);
      } else {
        await handleAssistantTurn(transcript);
      }
      setState("idle");
    };
    recorder.stop();
  }

  const statusLabel = {
    idle: proposal ? "Maintenez pour confirmer ou annuler à voix haute" : "Assistant prêt",
    processing: "Traitement en cours…",
    recording: "Je vous écoute…",
    speaking: "L’assistant vous répond…",
  }[state];

  return (
    <section aria-labelledby="voice-assistant-title" className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="px-5 pb-6 pt-7 text-center sm:px-7 sm:pt-8">
        <h2 className="text-xl font-semibold tracking-tight" id="voice-assistant-title">Parlez, je crée votre devis</h2>
        <p className="mt-2 text-sm text-muted-foreground">Maintenez le bouton pendant que vous parlez.</p>

        <div className="relative mx-auto mt-8 flex h-52 w-52 items-center justify-center sm:h-56 sm:w-56">
          <div className={`absolute inset-3 rounded-full border-2 border-dashed ${state === "recording" ? "animate-pulse border-red-300" : "border-muted-foreground/25"}`} />
          <Button
            aria-label={state === "recording" ? "Relâcher pour envoyer" : "Maintenir pour parler"}
            className="relative z-10 h-36 w-36 touch-none rounded-full bg-neutral-950 text-white shadow-xl transition-transform hover:bg-neutral-900 active:scale-95 sm:h-40 sm:w-40"
            disabled={state === "processing" || state === "speaking"}
            onPointerCancel={stopRecording}
            onPointerDown={(event) => {
              event.preventDefault();
              void startRecording();
            }}
            onPointerLeave={stopRecording}
            onPointerUp={stopRecording}
            type="button"
          >
            <span className="flex flex-col items-center gap-2">
              <Mic className="h-12 w-12" strokeWidth={1.8} />
              <span className="text-sm font-semibold">{state === "recording" ? "Relâchez" : "Parlez"}</span>
            </span>
          </Button>
        </div>

        <p className="mx-auto -mt-1 inline-flex rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm">
          {state === "recording" ? "Relâchez pour envoyer" : "Maintenez pour parler"}
        </p>

        {error ? <p aria-live="assertive" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
      </div>

      <div className="border-t border-border bg-muted/25 px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3 rounded-xl bg-background p-4 shadow-sm ring-1 ring-border">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold">{statusLabel}</p>
            <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">
              {proposal ? "Une action attend votre confirmation vocale." : state === "idle" ? "Je vous écoute dès que vous maintenez le bouton." : "Votre devis reste visible à droite pendant l’échange."}
            </p>
          </div>
        </div>

        {transcriptLog.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-left text-sm font-semibold">Dernières actions</h3>
            <ol aria-label="Historique de la conversation" className="mt-3 max-h-64 divide-y divide-border overflow-auto rounded-xl border border-border bg-background text-left text-sm">
              {transcriptLog.map((line, index) => (
                <li className="px-4 py-3 text-muted-foreground" key={`${index}-${line}`}>{line}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
