import "server-only";

import {
  getOrganizationBillingState,
  getStripePriceId,
  type BillingPeriod,
  type StripeSubscription,
} from "@/lib/billing/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export type AdminAlert = {
  detail: string;
  id: string;
  kind: "billing" | "conversion" | "inactivity" | "onboarding" | "trial";
  organizationName: string;
  priority: "high" | "medium";
};

export type AdminOrganizationRow = {
  acquisitionSource: string | null;
  activePlan: BillingPeriod | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  customerCount: number;
  email: string | null;
  finalizedQuoteCount: number;
  id: string;
  lastActivityAt: string | null;
  lastSignInAt: string | null;
  name: string;
  onboardingComplete: boolean;
  quoteCount: number;
  subscriptionStatus: string | null;
  trade: string | null;
  trialEnd: number | null;
  voiceActionCount: number;
};

export type AbandonedSignup = {
  createdAt: string;
  email: string | null;
  id: string;
  lastSignInAt: string | null;
};

export type AdminDashboardData = {
  abandonedSignups: AbandonedSignup[];
  alerts: AdminAlert[];
  organizations: AdminOrganizationRow[];
  sources: Array<{ count: number; label: string }>;
  stats: {
    activeSubscriptions: number;
    annualSubscriptions: number;
    cancellations: number;
    conversionRate: number;
    finalizedQuotes: number;
    inactiveTesters7d: number;
    incompleteOnboarding: number;
    monthlySubscriptions: number;
    mrrCents: number;
    newOrganizations30d: number;
    newOrganizations7d: number;
    pastDueSubscriptions: number;
    signupWithoutOrganization: number;
    testingOrganizations: number;
    totalOrganizations: number;
    totalQuotes: number;
    trialEndingSoon: number;
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

function latestIsoDate(values: Array<string | null | undefined>) {
  const valid = values.filter((value): value is string => Boolean(value));
  if (!valid.length) return null;
  return valid.reduce((latest, value) => new Date(value).getTime() > new Date(latest).getTime() ? value : latest);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [organizationsResult, quotesResult, customersResult, voiceActionsResult, usersResult, legalInfoResult, membersResult] = await Promise.all([
    admin.from("organizations").select("id, name, trade, acquisition_source, created_by, created_at, updated_at").order("created_at", { ascending: false }),
    admin.from("quotes").select("id, organization_id, status, updated_at"),
    admin.from("customers").select("id, organization_id"),
    admin.from("quote_ai_actions").select("id, organization_id, created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("company_legal_information").select("organization_id"),
    admin.from("organization_members").select("organization_id, user_id"),
  ]);

  if (organizationsResult.error) throw new Error("Impossible de charger les entreprises NALTO.");
  if (quotesResult.error) throw new Error("Impossible de charger les devis NALTO.");
  if (customersResult.error) throw new Error("Impossible de charger les clients NALTO.");
  if (voiceActionsResult.error) throw new Error("Impossible de charger l’activité vocale NALTO.");
  if (usersResult.error) throw new Error("Impossible de charger les utilisateurs NALTO.");
  if (legalInfoResult.error || membersResult.error) throw new Error("Impossible de charger l’avancement des comptes NALTO.");

  const organizations = organizationsResult.data ?? [];
  const quotes = quotesResult.data ?? [];
  const customers = customersResult.data ?? [];
  const voiceActions = voiceActionsResult.data ?? [];
  const users = usersResult.data.users;
  const usersById = new Map(users.map((user) => [user.id, user]));
  const legalInfoOrganizations = new Set((legalInfoResult.data ?? []).map((row) => row.organization_id));
  const memberUserIds = new Set((membersResult.data ?? []).map((row) => row.user_id));

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
    const organizationActions = voiceActions.filter((action) => action.organization_id === organization.id);
    const subscription = billingResults[index]?.status === "fulfilled" ? billingResults[index].value.subscription : null;
    const owner = usersById.get(organization.created_by);
    const latestQuote = latestIsoDate(organizationQuotes.map((quote) => quote.updated_at));
    const latestAction = latestIsoDate(organizationActions.map((action) => action.created_at));

    return {
      acquisitionSource: organization.acquisition_source,
      activePlan: planForSubscription(subscription, monthlyPriceId, annualPriceId),
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      createdAt: organization.created_at,
      customerCount: customers.filter((customer) => customer.organization_id === organization.id).length,
      email: owner?.email ?? null,
      finalizedQuoteCount: organizationQuotes.filter((quote) => quote.status === "finalized").length,
      id: organization.id,
      lastActivityAt: latestIsoDate([owner?.last_sign_in_at, organization.updated_at, latestQuote, latestAction]),
      lastSignInAt: owner?.last_sign_in_at ?? null,
      name: organization.name,
      onboardingComplete: legalInfoOrganizations.has(organization.id),
      quoteCount: organizationQuotes.length,
      subscriptionStatus: subscription?.status ?? null,
      trade: organization.trade,
      trialEnd: subscription?.trial_end ?? null,
      voiceActionCount: organizationActions.length,
    };
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * day;
  const thirtyDaysAgo = now - 30 * day;
  const twentyFourHoursAgo = now - day;
  const trialSoonLimit = now + 3 * day;
  const activeSubscriptions = rows.filter((row) => row.subscriptionStatus === "active").length;

  const abandonedSignups: AbandonedSignup[] = users
    .filter((user) => !memberUserIds.has(user.id))
    .map((user) => ({
      createdAt: user.created_at,
      email: user.email ?? null,
      id: user.id,
      lastSignInAt: user.last_sign_in_at ?? null,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const alerts: AdminAlert[] = [];
  for (const row of rows) {
    const lastActivity = row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
    if (["past_due", "unpaid"].includes(row.subscriptionStatus ?? "")) {
      alerts.push({ detail: "Paiement à régulariser.", id: `${row.id}-billing`, kind: "billing", organizationName: row.name, priority: "high" });
    }
    if (row.cancelAtPeriodEnd) {
      alerts.push({ detail: "Résiliation programmée à la fin de la période.", id: `${row.id}-cancel`, kind: "billing", organizationName: row.name, priority: "high" });
    }
    if (row.subscriptionStatus === "trialing" && row.trialEnd && row.trialEnd * 1000 >= now && row.trialEnd * 1000 <= trialSoonLimit) {
      alerts.push({ detail: "Essai gratuit se terminant dans moins de 3 jours.", id: `${row.id}-trial`, kind: "trial", organizationName: row.name, priority: "high" });
    }
    if (!row.subscriptionStatus && row.quoteCount >= 2) {
      alerts.push({ detail: `${row.quoteCount} devis créés sans abonnement : bon candidat à convertir.`, id: `${row.id}-conversion`, kind: "conversion", organizationName: row.name, priority: "medium" });
    }
    if (row.quoteCount > 0 && lastActivity && lastActivity < sevenDaysAgo && !["active", "trialing"].includes(row.subscriptionStatus ?? "")) {
      alerts.push({ detail: "Testeur inactif depuis plus de 7 jours.", id: `${row.id}-inactive`, kind: "inactivity", organizationName: row.name, priority: "medium" });
    }
    if (!row.onboardingComplete && new Date(row.createdAt).getTime() < twentyFourHoursAgo) {
      alerts.push({ detail: "Configuration de l’entreprise non terminée depuis plus de 24 h.", id: `${row.id}-onboarding`, kind: "onboarding", organizationName: row.name, priority: "medium" });
    }
  }
  for (const signup of abandonedSignups.filter((signup) => new Date(signup.createdAt).getTime() < twentyFourHoursAgo)) {
    alerts.push({ detail: `Compte créé sans entreprise${signup.email ? ` · ${signup.email}` : ""}.`, id: `${signup.id}-signup`, kind: "onboarding", organizationName: "Inscription incomplète", priority: "medium" });
  }

  alerts.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1));

  const sourceCounts = new Map<string, number>();
  for (const row of rows) {
    const source = row.acquisitionSource || "Non renseignée";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count);

  const mrrCents = organizations.reduce((sum, _organization, index) => {
    const subscription = billingResults[index]?.status === "fulfilled" ? billingResults[index].value.subscription : null;
    return sum + monthlyRecurringCents(subscription);
  }, 0);

  return {
    abandonedSignups,
    alerts,
    organizations: rows,
    sources,
    stats: {
      activeSubscriptions,
      annualSubscriptions: rows.filter((row) => row.subscriptionStatus === "active" && row.activePlan === "annual").length,
      cancellations: rows.filter((row) => row.subscriptionStatus === "canceled" || row.cancelAtPeriodEnd).length,
      conversionRate: rows.length ? (activeSubscriptions / rows.length) * 100 : 0,
      finalizedQuotes: quotes.filter((quote) => quote.status === "finalized").length,
      inactiveTesters7d: rows.filter((row) => row.quoteCount > 0 && Boolean(row.lastActivityAt) && new Date(row.lastActivityAt!).getTime() < sevenDaysAgo).length,
      incompleteOnboarding: rows.filter((row) => !row.onboardingComplete).length,
      monthlySubscriptions: rows.filter((row) => row.subscriptionStatus === "active" && row.activePlan === "monthly").length,
      mrrCents,
      newOrganizations30d: rows.filter((row) => new Date(row.createdAt).getTime() >= thirtyDaysAgo).length,
      newOrganizations7d: rows.filter((row) => new Date(row.createdAt).getTime() >= sevenDaysAgo).length,
      pastDueSubscriptions: rows.filter((row) => ["past_due", "unpaid"].includes(row.subscriptionStatus ?? "")).length,
      signupWithoutOrganization: abandonedSignups.length,
      testingOrganizations: rows.filter((row) => row.quoteCount > 0).length,
      totalOrganizations: rows.length,
      totalQuotes: quotes.length,
      trialEndingSoon: rows.filter((row) => row.subscriptionStatus === "trialing" && Boolean(row.trialEnd) && row.trialEnd! * 1000 >= now && row.trialEnd! * 1000 <= trialSoonLimit).length,
      trialingSubscriptions: rows.filter((row) => row.subscriptionStatus === "trialing").length,
      voiceActions: voiceActions.length,
    },
  };
}
