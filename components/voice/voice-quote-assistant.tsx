"use client";

import { useRef, useState } from "react";
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
    idle: proposal ? "Maintenez pour confirmer ou annuler à voix haute" : "Maintenez pour parler",
    processing: "Traitement en cours…",
    recording: "Je vous écoute…",
    speaking: "L’assistant parle…",
  }[state];

  return (
    <section aria-labelledby="voice-assistant-title" className="flex min-h-[70svh] flex-col items-center justify-between gap-6 px-4 py-8 text-center">
      <div>
        <h1 className="text-lg font-semibold" id="voice-assistant-title">Devis à la voix</h1>
        <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{statusLabel}</p>
        {error ? <p aria-live="assertive" className="mt-2 text-sm text-destructive" role="alert">{error}</p> : null}
      </div>

      <Button
        className="h-40 w-40 rounded-full text-lg font-semibold select-none"
        disabled={state === "processing" || state === "speaking"}
        onPointerCancel={stopRecording}
        onPointerDown={(event) => {
          event.preventDefault();
          void startRecording();
        }}
        onPointerLeave={stopRecording}
        onPointerUp={stopRecording}
        type="button"
        variant={state === "recording" ? "destructive" : "default"}
      >
        {state === "recording" ? "Relâchez" : "Parlez"}
      </Button>

      <ol aria-label="Historique de la conversation" className="w-full max-w-md space-y-1 text-left text-sm text-muted-foreground">
        {transcriptLog.map((line, index) => (
          <li key={`${index}-${line}`}>{line}</li>
        ))}
      </ol>
    </section>
  );
}
