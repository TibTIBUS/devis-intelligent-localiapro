import { NextResponse } from "next/server";

import { createVoiceOpenAIClient } from "@/lib/ai/client";
import { createRequestId, logTechnicalError, logTechnicalWarning } from "@/lib/observability/logger";
import { consumeAiRequestQuota } from "@/lib/security/ai-assistant-rate-limit";
import { parseBoundedAiJsonRequest } from "@/lib/security/bounded-json-request";
import { createClient } from "@/lib/supabase/server";
import { voiceSpeakRequestSchema } from "@/lib/validation/ai";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const requestBody = await parseBoundedAiJsonRequest(request);
  if (!requestBody.success) {
    return NextResponse.json({ error: requestBody.error }, { status: requestBody.status });
  }

  const parsed = voiceSpeakRequestSchema.safeParse(requestBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const quota = await consumeAiRequestQuota(claimsData.claims.sub, "voice_speak");
  if (quota !== "allowed") {
    logTechnicalWarning("voice.speak_limited", { requestId, userId: claimsData.claims.sub });
    if (quota === "limited") {
      return NextResponse.json(
        { error: "Trop de demandes vocales. Réessayez dans une minute." },
        { headers: { "Retry-After": "60" }, status: 429 },
      );
    }
    return NextResponse.json({ error: "La lecture audio est temporairement indisponible." }, { status: 503 });
  }

  try {
    const { client, ttsModel, ttsVoice } = createVoiceOpenAIClient();
    const speech = await client.audio.speech.create({
      input: parsed.data.text,
      model: ttsModel,
      voice: ttsVoice,
    });
    const audio = await speech.arrayBuffer();
    return new NextResponse(audio, {
      headers: { "Cache-Control": "no-store", "Content-Type": "audio/mpeg" },
      status: 200,
    });
  } catch (error) {
    logTechnicalError("voice.speak_failed", { requestId, userId: claimsData.claims.sub }, error);
    return NextResponse.json({ error: "La lecture audio est temporairement indisponible." }, { status: 503 });
  }
}
