import {
  setDepositArgumentsSchema,
  setDiscountArgumentsSchema,
  type AiQuoteActionProposal,
} from "@/lib/validation/ai";

export const setDiscountTool = {
  type: "function" as const,
  name: "set_discount",
  description: "Prépare le taux de remise global explicitement donné par l’artisan. Ne calcule aucun montant. Confirmation humaine obligatoire.",
  strict: true,
  parameters: {
    type: "object",
    properties: { discountRate: { type: "string", description: "Pourcentage exact donné par l’artisan, entre 0 et 100, sans symbole %." } },
    required: ["discountRate"],
    additionalProperties: false,
  },
};

export const setDepositTool = {
  type: "function" as const,
  name: "set_deposit",
  description: "Prépare le taux d’acompte global explicitement donné par l’artisan. Ne calcule aucun montant. Confirmation humaine obligatoire.",
  strict: true,
  parameters: {
    type: "object",
    properties: { depositRate: { type: "string", description: "Pourcentage exact donné par l’artisan, entre 0 et 100, sans symbole %." } },
    required: ["depositRate"],
    additionalProperties: false,
  },
};

export function prepareQuoteFinancialSettingTool(
  name: string,
  rawArguments: string,
  current: { depositRateBasisPoints: number; discountRateBasisPoints: number },
): AiQuoteActionProposal {
  const raw: unknown = JSON.parse(rawArguments);
  if (name === setDiscountTool.name) {
    const { discountRate } = setDiscountArgumentsSchema.parse(raw);
    return { actionType: "set_discount", currentRateBasisPoints: current.discountRateBasisPoints, rateBasisPoints: discountRate };
  }
  if (name === setDepositTool.name) {
    const { depositRate } = setDepositArgumentsSchema.parse(raw);
    return { actionType: "set_deposit", currentRateBasisPoints: current.depositRateBasisPoints, rateBasisPoints: depositRate };
  }
  throw new Error("Outil financier non autorisé.");
}
