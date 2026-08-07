import {
  setPaymentTermsArgumentsSchema,
  setValidityArgumentsSchema,
  setWorksiteAddressArgumentsSchema,
  updateQuoteNoteArgumentsSchema,
  type AiQuoteActionProposal,
} from "@/lib/validation/ai";

type WorkAddress = { id: string; label: string };

const confirmationOutput = {
  message: "La proposition est prête. Aucune donnée n’est encore enregistrée : demande à l’artisan d’utiliser la confirmation affichée.",
  status: "confirmation_required" as const,
};

export const setPaymentTermsTool = {
  type: "function" as const, name: "set_payment_terms", strict: true,
  description: "Prépare les conditions de paiement reprises exactement de la demande de l’artisan. N’invente aucune clause. Confirmation humaine obligatoire.",
  parameters: { type: "object", properties: { paymentTerms: { type: "string", description: "Texte exact explicitement dicté par l’artisan." } }, required: ["paymentTerms"], additionalProperties: false },
};

export const setValidityTool = {
  type: "function" as const, name: "set_validity", strict: true,
  description: "Prépare la date de fin de validité explicitement donnée au format ISO. Confirmation humaine obligatoire.",
  parameters: { type: "object", properties: { validUntil: { type: "string", description: "Date exacte au format YYYY-MM-DD." } }, required: ["validUntil"], additionalProperties: false },
};

export const setWorksiteAddressTool = {
  type: "function" as const, name: "set_worksite_address", strict: true,
  description: "Prépare le choix d’une adresse de chantier présente dans le contexte du client. Confirmation humaine obligatoire.",
  parameters: { type: "object", properties: { workAddressId: { type: "string", description: "Identifiant exact d’une adresse proposée dans le contexte." } }, required: ["workAddressId"], additionalProperties: false },
};

export const updateQuoteNoteTool = {
  type: "function" as const, name: "update_quote_note", strict: true,
  description: "Prépare la note du devis reprise exactement de la demande de l’artisan. Confirmation humaine obligatoire.",
  parameters: { type: "object", properties: { note: { type: "string", description: "Texte exact explicitement dicté par l’artisan." } }, required: ["note"], additionalProperties: false },
};

export function prepareQuoteMetadataTool(name: string, rawArguments: string, workAddresses: WorkAddress[]): AiQuoteActionProposal {
  const raw: unknown = JSON.parse(rawArguments);
  if (name === setPaymentTermsTool.name) return { actionType: "set_payment_terms", ...setPaymentTermsArgumentsSchema.parse(raw) };
  if (name === setValidityTool.name) return { actionType: "set_validity", ...setValidityArgumentsSchema.parse(raw) };
  if (name === updateQuoteNoteTool.name) return { actionType: "update_quote_note", ...updateQuoteNoteArgumentsSchema.parse(raw) };
  if (name === setWorksiteAddressTool.name) {
    const parsed = setWorksiteAddressArgumentsSchema.parse(raw);
    const address = workAddresses.find((candidate) => candidate.id === parsed.workAddressId);
    if (!address) throw new Error("Cette adresse n’appartient pas au client du devis actif.");
    return { actionType: "set_worksite_address", addressLabel: address.label, workAddressId: address.id };
  }
  throw new Error("Outil de paramétrage non autorisé.");
}

export { confirmationOutput };
