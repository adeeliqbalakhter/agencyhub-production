"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  Star,
  ArrowRight,
  Calendar,
  Users,
  FolderOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface SubscriptionData {
  plan_name: string;
  tier: string;
  status: string;
  monthly_lead_credits: number;
  max_portfolio_items: number;
  max_team_members: number;
  features: Record<string, unknown>;
  monthly_price: number;
  yearly_price: number;
  current_period_end?: string;
}

interface UsageData {
  portfolioCount: number;
  teamMemberCount: number;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  monthly_lead_credits: number;
  max_portfolio_items: number;
  max_team_members: number;
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}

const tierIcons: Record<string, typeof Star> = {
  free: Star,
  pro: Zap,
  enterprise: Crown,
};

const tierPopular: Record<string, boolean> = {
  pro: true,
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function featureList(plan: Plan): string[] {
  const items: string[] = [];
  if (plan.tier === "free") {
    items.push("Basic agency profile");
  } else if (plan.tier === "pro") {
    items.push("Enhanced profile with SEO");
  } else {
    items.push("Premium profile placement");
  }
  items.push(
    plan.monthly_lead_credits === -1
      ? "Unlimited lead credits"
      : `${plan.monthly_lead_credits} lead credits/month`
  );
  items.push(
    plan.max_portfolio_items === -1
      ? "Unlimited portfolio items"
      : `${plan.max_portfolio_items} portfolio items`
  );
  if (plan.tier === "pro") {
    items.push("Review management", "Analytics dashboard", "Priority support");
  } else if (plan.tier === "enterprise") {
    items.push(
      "Advanced analytics",
      "Custom branding",
      "Dedicated account manager",
      "API access"
    );
  } else {
    items.push("Standard support");
  }
  return items;
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [usage, setUsage] = useState<UsageData>({ portfolioCount: 0, teamMemberCount: 0 });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);

  const fetchSubscription = useCallback(async (): Promise<boolean> => {
    const res = await fetch("/api/subscriptions");
    if (res.ok) {
      const json = await res.json();
      setSubscription(json.data.subscription);
      setCreditBalance(json.data.creditBalance ?? 0);
      setUsage(json.data.usage ?? { portfolioCount: 0, teamMemberCount: 0 });
      return true;
    }
    // If 404, no subscription yet — auto-create free one
    if (res.status === 404) {
      const postRes = await fetch("/api/subscriptions", { method: "POST" });
      if (postRes.ok) {
        // Re-fetch to get full data with plan details
        const retryRes = await fetch("/api/subscriptions");
        if (retryRes.ok) {
          const json = await retryRes.json();
          setSubscription(json.data.subscription);
          setCreditBalance(json.data.creditBalance ?? 0);
          setUsage(json.data.usage ?? { portfolioCount: 0, teamMemberCount: 0 });
          return true;
        }
      }
    }
    return false;
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [subOk, plansRes] = await Promise.all([
          fetchSubscription(),
          fetch("/api/plans"),
        ]);

        if (!subOk) {
          setError("Could not load subscription data.");
        }

        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          setPlans(plansJson.data ?? []);
        }
      } catch {
        setError("Failed to load subscription data. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fetchSubscription]);

  function handleUpgrade(planName: string) {
    setUpgradeMessage(
      `To upgrade to the ${planName} plan, please contact us at support@listingproject.com or visit the contact page.`
    );
    // Auto-dismiss after 8 seconds
    setTimeout(() => setUpgradeMessage(null), 8000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchSubscription()
              .then(() => setLoading(false))
              .catch(() => {
                setError("Failed to load subscription data.");
                setLoading(false);
              });
          }}
          className="text-sm text-brand hover:text-brand-dark font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentTier = subscription?.tier ?? "free";
  const CurrentIcon = tierIcons[currentTier] ?? Star;
  const portfolioLimit = subscription?.max_portfolio_items ?? 0;
  const teamLimit = subscription?.max_team_members ?? 0;
  const leadCreditsLimit = subscription?.monthly_lead_credits ?? 0;
  const portfolioPercent =
    portfolioLimit > 0 ? Math.min(100, Math.round((usage.portfolioCount / portfolioLimit) * 100)) : 0;
  const teamPercent =
    teamLimit > 0 ? Math.min(100, Math.round((usage.teamMemberCount / teamLimit) * 100)) : 0;

  // Build feature list for the current plan from subscription data
  const currentPlanFeatures: string[] = [];
  if (subscription) {
    const matchingPlan = plans.find((p) => p.tier === subscription.tier);
    if (matchingPlan) {
      currentPlanFeatures.push(...featureList(matchingPlan));
    } else {
      // Fallback from subscription data directly
      currentPlanFeatures.push(
        `${leadCreditsLimit === -1 ? "Unlimited" : leadCreditsLimit} lead credits/month`,
        `${portfolioLimit === -1 ? "Unlimited" : portfolioLimit} portfolio items`,
        `${teamLimit === -1 ? "Unlimited" : teamLimit} team members`
      );
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Subscription</h1>
        <p className="mt-1 text-gray-500">
          Manage your plan, billing, and usage.
        </p>
      </div>

      {/* Upgrade message banner */}
      {upgradeMessage && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-navy">{upgradeMessage}</p>
          </div>
          <button
            onClick={() => setUpgradeMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <CurrentIcon className="w-6 h-6 text-brand" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-xl font-bold text-navy">
                {subscription?.plan_name ?? "Free"} Plan
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {subscription?.current_period_end
                ? `Renews on ${formatDate(subscription.current_period_end)}`
                : "No renewal date"}
            </p>
          </div>
        </div>

        {/* Current Plan Features */}
        {currentPlanFeatures.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-sm font-medium text-navy mb-3">Plan Features</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {currentPlanFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-brand" />
            <span className="text-sm font-medium text-navy">Credit Balance</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-navy">{creditBalance}</span>
            <span className="text-sm text-gray-500 mb-0.5">credits</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {leadCreditsLimit === -1
              ? "Unlimited monthly credits"
              : `${leadCreditsLimit} credits/month on this plan`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-navy">Portfolio Items</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-navy">
              {usage.portfolioCount}
            </span>
            <span className="text-sm text-gray-500 mb-0.5">
              {portfolioLimit === -1 ? "used" : `/ ${portfolioLimit} used`}
            </span>
          </div>
          {portfolioLimit > 0 && (
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${portfolioPercent}%` }}
              />
            </div>
          )}
          {portfolioLimit === -1 && (
            <p className="text-xs text-gray-400 mt-2">Unlimited on this plan</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-navy">Team Members</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-navy">
              {usage.teamMemberCount}
            </span>
            <span className="text-sm text-gray-500 mb-0.5">
              {teamLimit === -1 ? "active" : `/ ${teamLimit} used`}
            </span>
          </div>
          {teamLimit > 0 && (
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${teamPercent}%` }}
              />
            </div>
          )}
          {teamLimit === -1 && (
            <p className="text-xs text-gray-400 mt-2">Unlimited on this plan</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-navy">Monthly Price</span>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-navy">
              {subscription
                ? formatPrice(subscription.monthly_price)
                : "$0"}
            </span>
            <span className="text-sm text-gray-500 mb-0.5">/month</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {subscription?.current_period_end
              ? `Next billing ${formatDate(subscription.current_period_end)}`
              : "Free plan"}
          </p>
        </div>
      </div>

      {/* Upgrade Plans */}
      {plans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-5">
            Upgrade Your Plan
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const Icon = tierIcons[plan.tier] ?? Star;
              const isCurrent = plan.tier === currentTier;
              const isPopular = tierPopular[plan.tier] ?? false;
              const features = featureList(plan);

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl border-2 p-6 relative transition-colors ${
                    isCurrent
                      ? "border-brand bg-blue-50/30"
                      : isPopular
                      ? "border-brand/50"
                      : "border-gray-200"
                  }`}
                >
                  {isPopular && !isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-navy text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Current Plan
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-4 mt-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCurrent
                          ? "bg-brand/10"
                          : isPopular
                          ? "bg-blue-50"
                          : "bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isCurrent || isPopular
                            ? "text-brand"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy">{plan.name}</h3>
                      <p className="text-xs text-gray-500">
                        {plan.description ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold text-navy">
                      {formatPrice(plan.monthly_price)}
                    </span>
                    <span className="text-sm text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.name)}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark transition-colors flex items-center justify-center gap-1.5"
                    >
                      Upgrade to {plan.name}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Billing History */}
      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-navy">Billing History</h3>
        </div>
        <div className="px-6 py-8 text-center">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No billing history yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Payment processing is not yet enabled. Invoices will appear here once available.
          </p>
        </div>
      </div>
    </div>
  );
}
