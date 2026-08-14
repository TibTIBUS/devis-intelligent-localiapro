export type VoiceConfirmationResult = "cancel" | "confirm" | "unclear";

const CONFIRM_PHRASES = new Set([
  "je confirme",
  "confirme",
  "je valide",
  "valide",
  "c'est bon je confirme",
]);

const CANCEL_PHRASES = new Set([
  "j'annule",
  "annule",
  "j'annule tout",
  "non j'annule",
]);

function normalize(transcript: string): string {
  return transcript
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[.,!?;:]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Décide de façon déterministe si un tour de parole confirme ou annule une
 * proposition en attente. Volontairement hors du LLM : cette fonction est la
 * seule autorisée à déclencher un appel aux routes de confirmation/annulation
 * existantes, sur la base d'une correspondance stricte plutôt que d'une
 * inférence. Toute formulation ambiguë renvoie "unclear" pour forcer une
 * nouvelle relecture au lieu d'agir.
 */
export function matchVoiceConfirmation(transcript: string): VoiceConfirmationResult {
  const normalized = normalize(transcript);
  if (normalized.length === 0) return "unclear";

  if (CONFIRM_PHRASES.has(normalized)) return "confirm";
  if (CANCEL_PHRASES.has(normalized)) return "cancel";

  return "unclear";
}

const VAT_RATE_PATTERN = /(?<!\d)(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:%|pour\s*cent|pourcents?)/i;

/**
 * Extrait un taux de TVA énoncé explicitement dans un tour de parole
 * ("je confirme, dix pour cent"). Renvoie null si aucun taux clair n'est
 * trouvé — l'appelant doit alors redemander plutôt que d'inventer une valeur
 * par défaut, conformément à la règle métier "le LLM n'invente jamais la TVA".
 */
export function extractVoiceVatRate(transcript: string): string | null {
  const match = transcript.match(VAT_RATE_PATTERN);
  if (!match) return null;
  const numeric = Number(match[1].replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return null;
  return match[1];
}
