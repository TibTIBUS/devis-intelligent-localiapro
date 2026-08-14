export const MAX_VOICE_AUDIO_BODY_BYTES = 3 * 1024 * 1024;

const ALLOWED_AUDIO_CONTENT_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
]);

type AudioRequestError = {
  error: string;
  status: 400 | 413 | 415;
  success: false;
};

type AudioRequestSuccess = {
  contentType: string;
  data: Uint8Array;
  success: true;
};

export type BoundedAudioRequest = AudioRequestError | AudioRequestSuccess;

function invalidAudioRequest(): AudioRequestError {
  return { error: "Requête audio invalide.", status: 400, success: false };
}

function contentLengthExceedsLimit(request: Request): AudioRequestError | false {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return false;
  if (!/^\d+$/.test(contentLength)) return invalidAudioRequest();
  return Number(contentLength) > MAX_VOICE_AUDIO_BODY_BYTES
    ? { error: "Enregistrement trop volumineux.", status: 413, success: false }
    : false;
}

export async function parseBoundedAudioRequest(request: Request): Promise<BoundedAudioRequest> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_AUDIO_CONTENT_TYPES.has(contentType)) {
    return { error: "Format audio non pris en charge.", status: 415, success: false };
  }

  const declaredLimitError = contentLengthExceedsLimit(request);
  if (declaredLimitError) return declaredLimitError;
  if (!request.body) return invalidAudioRequest();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalLength += value.byteLength;
      if (totalLength > MAX_VOICE_AUDIO_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // La réponse 413 ne dépend pas du succès de l'annulation du flux distant.
        }
        return { error: "Enregistrement trop volumineux.", status: 413, success: false };
      }
      chunks.push(value);
    }
  } catch {
    return invalidAudioRequest();
  } finally {
    reader.releaseLock();
  }

  if (totalLength === 0) return invalidAudioRequest();

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { contentType, data: body, success: true };
}
