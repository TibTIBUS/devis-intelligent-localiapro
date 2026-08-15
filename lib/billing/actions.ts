"use server";

import { redirect } from "next/navigation";

import {
  createStripeCheckoutSession,
  createStripePortalSession,
  getOrCreateStripeCustomer,
  listStripeSubscriptions,
  type BillingPeriod,
} from "@/lib/billing/stripe";
import { getTrialStatus } from "@/lib/billing/trial";
import { getCurrentOrganizationId } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "paused"]);

function parsePeriod(value: FormDataEntryValue | null): BillingPeriod {
  if (value === "monthly" || value === "annual") return value;
  throw new Error("Périodicité d’abonnement invalide.");
}

async function getBillingIdentity() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) redirect("/connexion");

  const organizationId = await getCurrentOrganizationId(supabase);
  if (!organizationId) redirect("/onboarding");

  const { data: organization, error } = await supabase
    .from("organizations")
    .select("created_at, name")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !organization) throw new Error("Entreprise introuvable.");

  return {
    email: userData.user.email,
    organizationCreatedAt: organization.created_at,
    organizationId,
    organizationName: organization.name,
  };
}

export async function startSubscription(formData: FormData) {
  const period = parsePeriod(formData.get("period"));
  const identity = await getBillingIdentity();
  const customer = await getOrCreateStripeCustomer(identity);
  const subscriptions = await listStripeSubscriptions(customer.id);
  const latest = subscriptions[0];

  if (latest && MANAGEABLE_STATUSES.has(latest.status)) {
    const portal = await createStripePortalSession(customer.id);
    redirect(portal.url);
  }

  // Le report de la première facturation ne vaut que pour un premier
  // abonnement : une résiliation passée ne doit pas rouvrir un délai.
  const trial = getTrialStatus(identity.organizationCreatedAt);
  const trialEndsAt = subscriptions.length === 0 && !trial.expired ? trial.trialEndsAt : null;

  const checkout = await createStripeCheckoutSession({
    customerId: customer.id,
    organizationId: identity.organizationId,
    period,
    trialEndsAt,
  });

  if (!checkout.url) throw new Error("Stripe n’a pas retourné de page de paiement.");
  redirect(checkout.url);
}

export async function manageSubscription() {
  const identity = await getBillingIdentity();
  const customer = await getOrCreateStripeCustomer(identity);
  const portal = await createStripePortalSession(customer.id);
  redirect(portal.url);
}
