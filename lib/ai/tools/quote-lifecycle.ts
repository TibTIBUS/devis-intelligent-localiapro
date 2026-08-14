import { z } from "zod";

import type { AiQuoteActionProposal } from "@/lib/validation/ai";

type QuoteContact = { id: string; label: string };

const confirmationOutput = {
  message: "La proposition est prête. Aucune donnée n’est encore enregistrée : demande à l’artisan d’utiliser la confirmation affichée.",
  status: "confirmation_required" as const,
};

export const requestFinalizeQuoteTool = {
  type: "function" as const, name: "request_finalize_quote", strict: true,
  description: "Prépare la finalisation du devis actif. Ne calcule et n’invente rien : le serveur revérifie la conformité et attribue le numéro. Confirmation humaine obligatoire.",
  parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
};

export const requestSendQuoteEmailTool = {
  type: "function" as const, name: "request_send_quote_email", strict: true,
  description: "Prépare l’envoi par e-mail du devis finalisé à un contact du client, choisi exclusivement parmi ceux fournis dans le contexte. N’invente et ne recompose jamais une adresse. Confirmation humaine obligatoire.",
  parameters: {
    type: "object",
    properties: {
      contactId: { type: "string", description: "Identifiant exact d’un contact proposé dans le contexte du client." },
    },
    required: ["contactId"],
    additionalProperties: false,
  },
};

const requestSendQuoteEmailArgumentsSchema = z.object({ contactId: z.uuid() }).strict();

export function prepareRequestFinalizeQuoteTool(): AiQuoteActionProposal {
  return { actionType: "finalize_quote" };
}

export function prepareRequestSendQuoteEmailTool(rawArguments: string, contacts: QuoteContact[]): AiQuoteActionProposal {
  const raw: unknown = JSON.parse(rawArguments);
  const parsed = requestSendQuoteEmailArgumentsSchema.parse(raw);
  const contact = contacts.find((candidate) => candidate.id === parsed.contactId);
  if (!contact) throw new Error("Ce contact n’appartient pas au client du devis actif.");
  return { actionType: "send_quote_email", contactId: contact.id, contactLabel: contact.label };
}

export { confirmationOutput };
