export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    trackedProductLimit: 5,
    checkIntervalHours: 24,
  },
  plus: {
    name: "Plus",
    trackedProductLimit: 20,
    checkIntervalHours: 24,
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export type StoredSubscription = {
  plan?: unknown;
  status?: unknown;
  currentPeriodEnd?: unknown;
  cancelAtPeriodEnd?: unknown;
};

export type SubscriptionAccess = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isPaid: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trackedProductLimit: number;
  checkIntervalHours: number;
};

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["active", "trialing"]);
const VALID_STATUSES = new Set<SubscriptionStatus>([
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

function isSubscriptionPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === "string" && value in SUBSCRIPTION_PLANS;
}

export function hasReachedTrackedProductLimit(
  trackedProductCount: number,
  access: SubscriptionAccess
) {
  return trackedProductCount >= access.trackedProductLimit;
}

function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as SubscriptionStatus);
}

function parsePeriodEnd(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function getSubscriptionAccess(
  subscription: StoredSubscription | null | undefined,
  now = new Date()
): SubscriptionAccess {
  const storedStatus = isSubscriptionStatus(subscription?.status)
    ? subscription.status
    : "inactive";
  const currentPeriodEnd = parsePeriodEnd(subscription?.currentPeriodEnd);
  const periodHasEnded =
    currentPeriodEnd !== null && Date.parse(currentPeriodEnd) <= now.getTime();
  const paidPlan =
    isSubscriptionPlan(subscription?.plan) && subscription.plan !== "free"
      ? subscription.plan
      : null;
  const isPaid =
    paidPlan !== null &&
    ACTIVE_STATUSES.has(storedStatus) &&
    currentPeriodEnd !== null &&
    !periodHasEnded;
  const plan: SubscriptionPlan = isPaid ? paidPlan : "free";
  const definition = SUBSCRIPTION_PLANS[plan];

  return {
    plan,
    status: isPaid ? storedStatus : "inactive",
    isPaid,
    cancelAtPeriodEnd: isPaid && subscription?.cancelAtPeriodEnd === true,
    currentPeriodEnd: isPaid ? currentPeriodEnd : null,
    trackedProductLimit: definition.trackedProductLimit,
    checkIntervalHours: definition.checkIntervalHours,
  };
}
