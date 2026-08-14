import { NextResponse } from "next/server";

import { createVoiceOpenAIClient } from "@/lib/ai/client";
import { createRequestId, logTechnicalError, logTechnicalWarning } from "@/lib/observability/logger";
import { consumeAiRequestQuota } from "@/lib/security/ai-assistant-rate-limit";
import { parseBoundedAudioRequest } from "@/lib/security/bounded-audio-request";
import { createClient } from "@/lib/supabase/server";

const AUDIO_FILE_NAMES: Record<string, string> = {
  "audio/webm": "audio.webm",
  "audio/ogg": "audio.ogg",
  "audio/mp4": "audio.mp4",
  "audio/mpeg": "audio.mp3",
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const audio = await parseBoundedAudioRequest(request);
  if (!audio.success) {
    return NextResponse.json({ error: audio.error }, { status: audio.status });
  }

  const quota = await consumeAiRequestQuota(claimsData.claims.sub, "voice_transcribe");
  if (quota !== "allowed") {
    logTechnicalWarning("voice.transcribe_limited", { requestId, userId: claimsData.claims.sub });
    if (quota === "limited") {
      return NextResponse.json(
        { error: "Trop de demandes vocales. Réessayez dans une minute." },
        { headers: { "Retry-After": "60" }, status: 429 },
      );
    }
    return NextResponse.json({ error: "La transcription est temporairement indisponible." }, { status: 503 });
  }

  try {
    const { client, transcriptionModel } = createVoiceOpenAIClient();
    const fileName = AUDIO_FILE_NAMES[audio.contentType] ?? "audio.webm";
    const bytes = new Uint8Array(audio.data);
    const file = new File([bytes], fileName, { type: audio.contentType });
    const transcription = await client.audio.transcriptions.create({
      file,
      language: "fr",
      model: transcriptionModel,
    });
    const transcript = transcription.text.trim();
    if (!transcript) {
      return NextResponse.json({ error: "Aucune parole détectée." }, { status: 422 });
    }
    return NextResponse.json({ transcript });
  } catch (error) {
    logTechnicalError("voice.transcribe_failed", { requestId, userId: claimsData.claims.sub }, error);
    return NextResponse.json({ error: "La transcription est temporairement indisponible." }, { status: 503 });
  }
}
