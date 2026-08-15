import "server-only";

import {
  getOrganizationBillingState,
  getStripePriceId,
  type BillingPeriod,
  type StripeSubscription,
} from "@/lib/billing/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type AdminOrganizationRow = {
  activePlan: BillingPeriod | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  customerCount: number;
  email: string | null;
  finalizedQuoteCount: number;
  id: string;
  lastSignInAt: string | null;
  name: string;
  quoteCount: number;
  subscriptionStatus: string | null;
  trade: string | null;
  trialEnd: number | null;
  voiceActionCount: number;
};

export type AdminDashboardData = {
  organizations: AdminOrganizationRow[];
  stats: {
    activeSubscriptions: number;
    annualSubscriptions: number;
    cancellations: number;
    conversionRate: number;
    finalizedQuotes: number;
    monthlySubscriptions: number;
    mrrCents: number;
    newOrganizations30d: number;
    newOrganizations7d: number;
    pastDueSubscriptions: number;
    testingOrganizations: number;
    totalOrganizations: number;
    totalQuotes: number;
    trialingSubscriptions: number;
    voiceActions: number;
  };
};

export async function isCurrentUserAppAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  return !error && Boolean(data);
}

function planForSubscription(subscription: StripeSubscription | null, monthlyPriceId: string, annualPriceId: string) {
  const priceId = subscription?.items.data[0]?.price.id;
  if (!priceId) return null;
  if (priceId === monthlyPriceId) return "monthly" as const;
  if (priceId === annualPriceId) return "annual" as const;
  return null;
}

function monthlyRecurringCents(subscription: StripeSubscription | null) {
  if (!subscription || subscription.status !== "active") return 0;
  const price = subscription.items.data[0]?.price;
  const amount = price?.unit_amount ?? 0;
  if (!amount) return 0;
  return price?.recurring?.interval === "year" ? Math.round(amount / 12) : amount;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [organizationsResult, quotesResult, customersResult, voiceActionsResult, usersResult] = await Promise.all([
    admin.from("organizations").select("id, name, trade, created_by, created_at").order("created_at", { ascending: false }),
    admin.from("quotes").select("id, organization_id, status"),
    admin.from("customers").select("id, organization_id"),
    admin.from("quote_ai_actions").select("id, organization_id"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (organizationsResult.error) throw new Error("Impossible de charger les entreprises NALTO.");
  if (quotesResult.error) throw new Error("Impossible de charger les devis NALTO.");
  if (customersResult.error) throw new Error("Impossible de charger les clients NALTO.");
  if (voiceActionsResult.error) throw new Error("Impossible de charger l’activité vocale NALTO.");
  if (usersResult.error) throw new Error("Impossible de charger les utilisateurs NALTO.");

  const organizations = organizationsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const customers = customersResult.data ?? [];
  const voiceActions = voiceActionsResult.data ?? [];
  const usersById = new Map(usersResult.data.users.map((user) => [user.id, user]));

  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_MONTHLY && process.env.STRIPE_PRICE_ANNUAL,
  );
  const monthlyPriceId = stripeConfigured ? getStripePriceId("monthly") : "";
  const annualPriceId = stripeConfigured ? getStripePriceId("annual") : "";

  const billingResults = stripeConfigured
    ? await Promise.allSettled(organizations.map((organization) => getOrganizationBillingState(organization.id)))
    : organizations.map(() => ({ status: "fulfilled", value: { customer: null, subscription: null } } as const));

  const rows: AdminOrganizationRow[] = organizations.map((organization, index) => {
    const organizationQuotes = quotes.filter((quote) => quote.organization_id === organization.id);
    const subscription = billingResults[index]?.status === "fulfilled"
      ? billingResults[index].value.subscription
      : null;
    const owner = usersById.get(organization.created_by);

    return {
      activePlan: planForSubscription(subscription, monthlyPriceId, annualPriceId),
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      createdAt: organization.created_at,
      customerCount: customers.filter((customer) => customer.organization_id === organization.id).length,
      email: owner?.email ?? null,
      finalizedQuoteCount: organizationQuotes.filter((quote) => quote.status === "finalized").length,
      id: organization.id,
      lastSignInAt: owner?.last_sign_in_at ?? null,
      name: organization.name,
      quoteCount: organizationQuotes.length,
      subscriptionStatus: subscription?.status ?? null,
      trade: organization.trade,
      trialEnd: subscription?.trial_end ?? null,
      voiceActionCount: voiceActions.filter((action) => action.organization_id === organization.id).length,
    };
  });

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const activeSubscriptions = rows.filter((row) => row.subscriptionStatus === "active").length;

  const mrrCents = organizations.reduce((sum, organization, index) => {
    const subscription = billingResults[index]?.status === "fulfilled"
      ? billingResults[index].value.subscription
      : null;
    return sum + monthlyRecurringCents(subscription);
  }, 0);

  return {
    organizations: rows,
    stats: {
      activeSubscriptions,
      annualSubscriptions: rows.filter((row) => row.subscriptionStatus === "active" && row.activePlan === "annual").length,
      cancellations: rows.filter((row) => row.subscriptionStatus === "canceled" || row.cancelAtPeriodEnd).length,
      conversionRate: rows.length ? (activeSubscriptions / rows.length) * 100 : 0,
      finalizedQuotes: quotes.filter((quote) => quote.status === "finalized").length,
      monthlySubscriptions: rows.filter((row) => row.subscriptionStatus === "active" && row.activePlan === "monthly").length,
      mrrCents,
      newOrganizations30d: rows.filter((row) => new Date(row.createdAt).getTime() >= thirtyDaysAgo).length,
      newOrganizations7d: rows.filter((row) => new Date(row.createdAt).getTime() >= sevenDaysAgo).length,
      pastDueSubscriptions: rows.filter((row) => ["past_due", "unpaid"].includes(row.subscriptionStatus ?? "")).length,
      testingOrganizations: rows.filter((row) => row.quoteCount > 0).length,
      totalOrganizations: rows.length,
      totalQuotes: quotes.length,
      trialingSubscriptions: rows.filter((row) => row.subscriptionStatus === "trialing").length,
      voiceActions: voiceActions.length,
    },
  };
}
