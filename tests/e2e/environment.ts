export type E2eEnvironment = {
  [key: string]: string | undefined;
  E2E_BASE_URL?: string;
  E2E_ENVIRONMENT?: string;
  E2E_EMAIL?: string;
  E2E_PASSWORD?: string;
  E2E_FINALIZED_QUOTE_ID?: string;
  E2E_DOCUMENT_ID?: string;
};

export function assertE2eEnvironment(env: E2eEnvironment) {
  if (!env.E2E_BASE_URL) return { enabled: false } as const;
  if (env.E2E_ENVIRONMENT !== "isolated") {
    throw new Error("Les tests E2E exigent E2E_ENVIRONMENT=isolated ; l'environnement de production est interdit.");
  }
  const required = ["E2E_EMAIL", "E2E_PASSWORD", "E2E_FINALIZED_QUOTE_ID", "E2E_DOCUMENT_ID"] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Variables E2E manquantes : ${missing.join(", ")}.`);
  return { enabled: true } as const;
}
