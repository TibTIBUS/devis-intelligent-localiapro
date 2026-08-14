import "server-only";

import { Resend } from "resend";

import { parseResendEnv } from "@/lib/validation/env";

export function createResendClient() {
  const env = parseResendEnv(process.env);

  return {
    client: new Resend(env.RESEND_API_KEY),
    fromEmail: env.RESEND_FROM_EMAIL,
  };
}
