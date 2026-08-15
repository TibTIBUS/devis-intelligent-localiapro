export const TRIAL_DAYS = 14;
export const TRIAL_REMINDER_THRESHOLD_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrialStatus = {
  daysRemaining: number;
  expired: boolean;
  trialEndsAt: Date;
};

/**
 * Calcule l'état de l'essai gratuit de 14 jours à partir de la date de
 * création de l'entreprise. Aucune donnée n'est stockée : la date de fin
 * d'essai est toujours recalculée à partir de `organizations.created_at`,
 * source de vérité unique.
 */
export function getTrialStatus(organizationCreatedAt: string, now: Date = new Date()): TrialStatus {
  const trialEndsAt = new Date(new Date(organizationCreatedAt).getTime() + TRIAL_DAYS * MS_PER_DAY);
  const msRemaining = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / MS_PER_DAY));

  return { daysRemaining, expired: msRemaining <= 0, trialEndsAt };
}
