"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Mic, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { AiConversationMessage } from "@/lib/validation/ai";

type VoiceState = "idle" | "recording" | "processing" | "speaking";

// Chrome/Edge produisent du webm, Safari (iOS et macOS) du mp4, Firefox de l'ogg.
const AUDIO_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

// Types acceptés par /api/ai/voice/transcribe.
const SERVER_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return AUDIO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

// Certains navigateurs renvoient un type que le serveur refuse (audio/x-matroska
// sur quelques versions de Chrome, ou une chaîne vide). On le ramène toujours
// vers un type pris en charge plutôt que de laisser partir une requête en 415.
function toServerAudioType(rawType: string): string {
  const baseType = rawType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (SERVER_AUDIO_TYPES.includes(baseType)) return baseType;
  if (baseType.includes("mp4") || baseType.includes("m4a") || baseType.includes("aac")) return "audio/mp4";
  if (baseType.includes("ogg")) return "audio/ogg";
  if (baseType.includes("mpeg") || baseType.includes("mp3")) return "audio/mpeg";
  return "audio/webm";
}

function createSilentAudioUrl(): string {
  const bytes = new Uint8Array([
    82, 73, 70, 70, 37, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32,
    16, 0, 0, 0, 1, 0, 1, 0, 64, 31, 0, 0, 64, 31, 0, 0,
    1, 0, 8, 0, 100, 97, 116, 97, 1, 0, 0, 0, 128,
  ]);
  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

function microphoneErrorMessage(error: unknown): string {
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Le microphone n’est pas disponible dans ce navigateur. Vérifiez que vous utilisez le site en HTTPS avec un navigateur récent.";
  }

  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "L’accès au microphone est bloqué. Autorisez le micro pour ce site dans les paramètres du navigateur puis réessayez.";
    }
    if (error.name === "NotFoundError") return "Aucun microphone n’a été détecté sur cet appareil.";
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "Le microphone est détecté mais ne peut pas être utilisé. Fermez les applications qui utilisent le micro puis réessayez.";
    }
    if (error.name === "OverconstrainedError") {
      return "Le microphone sélectionné n’est pas compatible avec les réglages demandés.";
    }
  }

  return "Impossible d’accéder au microphone. Vérifiez l’autorisation du site et le microphone sélectionné dans le navigateur.";
}

export function VoiceQuoteAssistant({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcriptLog, setTranscriptLog] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [manualPlaybackAvailable, setManualPlaybackAvailable] = useState(false);
  const messagesRef = useRef<AiConversationMessage[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const holdingRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const currentAudioUrlRef = useRef<string | null>(null);

  function logLine(line: string) {
    setTranscriptLog((current) => [...current, line].slice(-8));
  }

  function getAudioPlayer() {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  function unlockAudioPlayback() {
    if (audioUnlockedRef.current) return;
    const audio = getAudioPlayer();
    const silentUrl = createSilentAudioUrl();
    // Le contenu est silencieux : on le joue volontairement NON muet, car les
    // navigateurs autorisent toujours la lecture muette et n'accordent alors
    // aucune permission durable à l'élément audio.
    audio.muted = false;
    audio.src = silentUrl;
    const playback = audio.play();
    if (!playback) {
      audioUnlockedRef.current = true;
      audio.pause();
      URL.revokeObjectURL(silentUrl);
      return;
    }
    void playback
      .then(() => {
        audioUnlockedRef.current = true;
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => undefined)
      .finally(() => {
        URL.revokeObjectURL(silentUrl);
      });
  }

  async function playCurrentAudio() {
    const audio = getAudioPlayer();
    if (!currentAudioUrlRef.current) return false;
    audio.pause();
    audio.src = currentAudioUrlRef.current;
    audio.currentTime = 0;
    audio.muted = false;
    try {
      await audio.play();
      audioUnlockedRef.current = true;
      setManualPlaybackAvailable(false);
      return true;
    } catch {
      setManualPlaybackAvailable(true);
      return false;
    }
  }

  async function speak(text: string) {
    setState("speaking");
    try {
      const response = await fetch("/api/ai/voice/speak", {
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        setError("La réponse a bien été générée, mais le son n’a pas pu être chargé.");
        return;
      }

      const audioBlob = await response.blob();
      if (currentAudioUrlRef.current) URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = URL.createObjectURL(audioBlob);

      const audio = getAudioPlayer();
      audio.onended = () => setState("idle");
      audio.onerror = () => {
        setManualPlaybackAvailable(true);
        setState("idle");
      };

      const played = await playCurrentAudio();
      if (!played) {
        setError("Votre navigateur a bloqué la lecture automatique. Cliquez sur « Écouter la réponse ».");
      }
    } finally {
      setState("idle");
    }
  }

  async function transcribe(blob: Blob): Promise<string | null> {
    if (blob.size === 0) {
      setError("Aucun son n’a été capté. Maintenez le bouton pendant que vous parlez.");
      return null;
    }

    const response = await fetch("/api/ai/voice/transcribe", {
      body: blob,
      headers: { "Content-Type": toServerAudioType(blob.type) },
      method: "POST",
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; transcript?: string };
    if (!response.ok || !data.transcript) {
      setError(data.error ?? "Je n’ai pas compris.");
      return null;
    }
    return data.transcript;
  }

  async function handleAssistantTurn(transcript: string) {
    const nextMessages: AiConversationMessage[] = [
      ...messagesRef.current,
      { content: transcript, role: "user" as const },
    ].slice(-10);
    messagesRef.current = nextMessages;
    logLine(`Vous : ${transcript}`);
    setState("processing");
    setError("");
    setManualPlaybackAvailable(false);

    try {
      const response = await fetch("/api/ai/quote-assistant", {
        body: JSON.stringify({ messages: nextMessages, quoteId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Réponse invalide.");

      messagesRef.current = [...nextMessages, { content: data.message, role: "assistant" as const }].slice(-10);
      logLine(`Nalto : ${data.message}`);
      router.refresh();
      await speak(data.message);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "L’assistant est indisponible.";
      setError(message);
      await speak(message);
    }
  }

  async function startRecording() {
    if (recorderRef.current || state === "processing" || state === "speaking") return;
    holdingRef.current = true;
    setError("");
    unlockAudioPlayback();
    try {
      if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder unavailable");

      const currentStream = streamRef.current;
      const currentTrack = currentStream?.getAudioTracks()[0];
      if (!currentStream || !currentTrack || currentTrack.readyState !== "live") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const stream = streamRef.current;
      if (!stream) throw new Error("Microphone stream unavailable");

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setState("recording");

      // L'autorisation du micro peut prendre du temps : si le bouton a déjà été
      // relâché entre-temps, on arrête immédiatement au lieu d'enregistrer
      // indéfiniment.
      if (!holdingRef.current) stopRecording();
    } catch (caught) {
      holdingRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(microphoneErrorMessage(caught));
      setState("idle");
    }
  }

  function stopRecording() {
    holdingRef.current = false;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorderRef.current = null;
    const mimeType = recorder.mimeType;
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      setState("processing");
      try {
        const transcript = await transcribe(blob);
        if (!transcript) return;
        await handleAssistantTurn(transcript);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Impossible de traiter cet enregistrement. Réessayez.");
      } finally {
        setState("idle");
      }
    };
    recorder.stop();
  }

  const statusLabel = {
    idle: "Nalto est prêt",
    processing: "Nalto met le devis à jour…",
    recording: "Je vous écoute…",
    speaking: "Nalto vous répond…",
  }[state];

  return (
    <section aria-labelledby="voice-assistant-title" className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <div className="px-4 pb-4 pt-5 text-center sm:px-7 sm:pb-6 sm:pt-8">
        <h2 className="text-lg font-semibold tracking-tight text-primary sm:text-xl" id="voice-assistant-title">Parlez, Nalto met le devis à jour</h2>
        <p className="mt-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">Maintenez le bouton et dites tout ce que vous voulez ajouter ou modifier.</p>

        <div className="relative mx-auto mt-4 flex h-44 w-44 items-center justify-center sm:mt-8 sm:h-56 sm:w-56">
          <div className={`absolute inset-3 rounded-full border-2 border-dashed ${state === "recording" ? "animate-pulse border-[#E8672E]" : "border-primary/20"}`} />
          <Button
            aria-label={state === "recording" ? "Relâcher pour envoyer" : "Maintenir pour parler"}
            className="relative z-10 h-28 w-28 touch-none rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:bg-primary/90 active:scale-95 sm:h-40 sm:w-40"
            disabled={state === "processing" || state === "speaking"}
            onLostPointerCapture={stopRecording}
            onPointerCancel={stopRecording}
            onPointerDown={(event) => {
              event.preventDefault();
              try {
                event.currentTarget.setPointerCapture(event.pointerId);
              } catch {
                // La capture n'est pas indispensable : le relâchement reste géré
                // par onPointerUp sur les navigateurs qui la refusent.
              }
              unlockAudioPlayback();
              void startRecording();
            }}
            onPointerUp={stopRecording}
            type="button"
          >
            <span className="flex flex-col items-center gap-1.5 sm:gap-2">
              <Mic className="h-8 w-8 sm:h-12 sm:w-12" strokeWidth={1.8} />
              <span className="text-sm font-semibold">{state === "recording" ? "Relâchez" : "Parlez"}</span>
            </span>
          </Button>
        </div>

        <p className="mx-auto -mt-1 inline-flex rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium shadow-sm sm:text-sm">
          {state === "recording" ? "Relâchez pour envoyer" : "Maintenez pour parler"}
        </p>
        {manualPlaybackAvailable ? (
          <Button
            className="mx-auto mt-3 flex min-h-11 items-center gap-2"
            onClick={() => {
              setError("");
              void playCurrentAudio();
            }}
            type="button"
            variant="outline"
          >
            <Volume2 className="size-4" /> Écouter la réponse
          </Button>
        ) : null}
        {error ? <p aria-live="assertive" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:mt-4" role="alert">{error}</p> : null}
      </div>

      <div className="border-t border-border bg-secondary px-3 py-3 sm:px-7 sm:py-5">
        <div className="flex items-start gap-3 rounded-xl bg-background p-3 shadow-sm ring-1 ring-border sm:p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#397255]" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold">{statusLabel}</p>
            <p aria-live="polite" className="mt-1 text-xs text-muted-foreground">{state === "idle" ? "Les actions comprises sont appliquées directement au brouillon." : "Votre devis reste visible pendant l’échange."}</p>
          </div>
        </div>

        {transcriptLog.length > 0 ? (
          <div className="mt-4 sm:mt-5">
            <h3 className="text-left text-sm font-semibold">Dernières actions</h3>
            <ol aria-label="Historique de la conversation" className="mt-2 max-h-48 divide-y divide-border overflow-auto rounded-xl border border-border bg-background text-left text-sm sm:mt-3 sm:max-h-64">
              {transcriptLog.map((line, index) => <li className="px-3 py-2.5 text-muted-foreground sm:px-4 sm:py-3" key={`${index}-${line}`}>{line}</li>)}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
