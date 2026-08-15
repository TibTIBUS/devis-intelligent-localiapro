import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getOrganizationBillingState } from "@/lib/billing/stripe";
import { getTrialStatus, TRIAL_REMINDER_THRESHOLD_DAYS } from "@/lib/billing/trial";

export type OrganizationAccessStatus = {
  hasAccess: boolean;
  isSubscribed: boolean;
  reminder: { daysRemaining: number } | null;
  trialDaysRemaining: number;
  trialEndsAt: Date;
  trialExpired: boolean;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL,
  );
}

/**
 * Détermine si une entreprise peut utiliser l'application : abonnement Stripe
 * actif, ou essai gratuit de 14 jours non expiré. Aucune dépendance à Stripe
 * n'est requise pour profiter de l'essai — la vérification Stripe n'est
 * qu'une extension une fois l'essai terminé.
 */
export async function getOrganizationAccessStatus(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationAccessStatus> {
  const { data: organization } = await supabase
    .from("organizations")
    .select("created_at")
    .eq("id", organizationId)
    .maybeSingle();

  const trial = getTrialStatus(organization?.created_at ?? new Date(0).toISOString());

  const billing = isStripeConfigured()
    ? await getOrganizationBillingState(organizationId).catch(() => ({ customer: null, subscription: null }))
    : { customer: null, subscription: null };
  const isSubscribed = Boolean(
    billing.subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(billing.subscription.status),
  );

  const reminder =
    !isSubscribed && !trial.expired && trial.daysRemaining <= TRIAL_REMINDER_THRESHOLD_DAYS
      ? { daysRemaining: trial.daysRemaining }
      : null;

  return {
    hasAccess: isSubscribed || !trial.expired,
    isSubscribed,
    reminder,
    trialDaysRemaining: trial.daysRemaining,
    trialEndsAt: trial.trialEndsAt,
    trialExpired: trial.expired,
  };
}
