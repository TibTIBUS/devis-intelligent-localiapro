import "server-only";

import { parseStripeEnv } from "@/lib/validation/env";

export type BillingPeriod = "annual" | "monthly";

type StripeList<T> = { data: T[] };

export type StripeCustomer = {
  id: string;
  email: string | null;
  metadata: Record<string, string>;
  name?: string | null;
};

export type StripeSubscription = {
  cancel_at_period_end: boolean;
  created: number;
  current_period_end?: number;
  id: string;
  items: {
    data: Array<{
      price: {
        id: string;
        recurring?: { interval?: string | null } | null;
        unit_amount?: number | null;
      };
    }>;
  };
  status: string;
  trial_end: number | null;
};

export type StripePrice = {
  currency: string;
  id: string;
  recurring?: { interval?: string | null } | null;
  unit_amount: number | null;
};

type StripeCheckoutSession = { id: string; url: string | null };
type StripePortalSession = { url: string };

function formBody(values: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, String(value));
  }
  return body;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const env = parseStripeEnv(process.env);
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...init?.headers,
    },
  });

  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(data.error?.message ?? "Stripe n’a pas pu traiter la demande.");
  }
  return data;
}

export function getStripePriceId(period: BillingPeriod) {
  const env = parseStripeEnv(process.env);
  return period === "annual" ? env.STRIPE_PRICE_ANNUAL : env.STRIPE_PRICE_MONTHLY;
}

// Les montants affichés sont toujours relus dans Stripe : une page qui code ses
// prix en dur finit par annoncer un tarif différent de celui réellement débité.
export async function getStripePlanPricing() {
  const [monthly, annual] = await Promise.all([
    stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(getStripePriceId("monthly"))}`),
    stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(getStripePriceId("annual"))}`),
  ]);
  return { annual, monthly };
}

export async function findStripeCustomerForOrganization(organizationId: string) {
  const query = `metadata['organization_id']:'${organizationId}'`;
  const result = await stripeRequest<StripeList<StripeCustomer>>(
    `/v1/customers/search?query=${encodeURIComponent(query)}&limit=1`,
  );
  return result.data[0] ?? null;
}

export async function getOrCreateStripeCustomer({
  email,
  organizationId,
  organizationName,
}: {
  email: string;
  organizationId: string;
  organizationName: string;
}) {
  const existing = await findStripeCustomerForOrganization(organizationId);
  if (existing) return existing;

  return stripeRequest<StripeCustomer>("/v1/customers", {
    body: formBody({
      email,
      name: organizationName,
      "metadata[organization_id]": organizationId,
      "metadata[app]": "nalto",
    }),
    headers: { "Idempotency-Key": `nalto-customer-${organizationId}` },
    method: "POST",
  });
}

export async function listStripeSubscriptions(customerId: string) {
  const result = await stripeRequest<StripeList<StripeSubscription>>(
    `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=20`,
  );
  return [...result.data].sort((a, b) => b.created - a.created);
}

export async function getOrganizationBillingState(organizationId: string) {
  const customer = await findStripeCustomerForOrganization(organizationId);
  if (!customer) return { customer: null, subscription: null } as const;
  const subscriptions = await listStripeSubscriptions(customer.id);
  return { customer, subscription: subscriptions[0] ?? null } as const;
}

export async function createStripeCheckoutSession({
  customerId,
  organizationId,
  period,
  trialEligible,
}: {
  customerId: string;
  organizationId: string;
  period: BillingPeriod;
  trialEligible: boolean;
}) {
  const env = parseStripeEnv(process.env);
  const priceId = getStripePriceId(period);

  return stripeRequest<StripeCheckoutSession>("/v1/checkout/sessions", {
    body: formBody({
      mode: "subscription",
      customer: customerId,
      client_reference_id: organizationId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      billing_address_collection: "required",
      "customer_update[address]": "auto",
      "customer_update[name]": "auto",
      "metadata[organization_id]": organizationId,
      "metadata[app]": "nalto",
      "subscription_data[metadata][organization_id]": organizationId,
      "subscription_data[metadata][app]": "nalto",
      "subscription_data[trial_period_days]": trialEligible ? 14 : undefined,
      success_url: `${env.NEXT_PUBLIC_APP_URL}/abonnement?succes=1`,
      cancel_url: `${env.NEXT_PUBLIC_APP_URL}/abonnement?annule=1`,
      locale: "fr",
    }),
    method: "POST",
  });
}

export async function createStripePortalSession(customerId: string) {
  const env = parseStripeEnv(process.env);
  return stripeRequest<StripePortalSession>("/v1/billing_portal/sessions", {
    body: formBody({
      customer: customerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/abonnement`,
    }),
    method: "POST",
  });
}
