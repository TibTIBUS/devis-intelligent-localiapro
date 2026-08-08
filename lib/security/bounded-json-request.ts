export const MAX_AI_JSON_BODY_BYTES = 16 * 1024;

type JsonRequestError = {
  error: string;
  status: 400 | 413 | 415;
  success: false;
};

type JsonRequestSuccess = {
  data: unknown;
  success: true;
};

export type BoundedJsonRequest = JsonRequestError | JsonRequestSuccess;

function invalidJsonRequest(): JsonRequestError {
  return { error: "Requête JSON invalide.", status: 400, success: false };
}

function contentLengthExceedsLimit(request: Request): JsonRequestError | false {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return false;
  if (!/^\d+$/.test(contentLength)) return invalidJsonRequest();
  return Number(contentLength) > MAX_AI_JSON_BODY_BYTES
    ? { error: "Requête trop volumineuse.", status: 413, success: false }
    : false;
}

export async function parseBoundedAiJsonRequest(request: Request): Promise<BoundedJsonRequest> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { error: "Le type de contenu doit être application/json.", status: 415, success: false };
  }

  const declaredLimitError = contentLengthExceedsLimit(request);
  if (declaredLimitError) return declaredLimitError;
  if (!request.body) return invalidJsonRequest();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalLength += value.byteLength;
      if (totalLength > MAX_AI_JSON_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // La réponse 413 ne dépend pas du succès de l'annulation du flux distant.
        }
        return { error: "Requête trop volumineuse.", status: 413, success: false };
      }
      chunks.push(value);
    }
  } catch {
    return invalidJsonRequest();
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { data: JSON.parse(new TextDecoder().decode(body)), success: true };
  } catch {
    return invalidJsonRequest();
  }
}
