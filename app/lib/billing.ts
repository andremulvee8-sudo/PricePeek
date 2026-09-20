import type Stripe from "stripe";
import type { SubscriptionStatus } from "./subscription";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUserId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "unpaid":
      return "past_due";
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

export function getStripeSubscriptionPeriodEnd(
  subscription: Pick<Stripe.Subscription, "items">
): string | null {
  const timestamps = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isFinite(value));

  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps) * 1000).toISOString();
}

export function getStripeId(
  value: string | { id: string } | null
): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function getBillingReturnUrl(requestUrl: string, path: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const hostname = new URL(requestOrigin).hostname;
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1");
  const origin = isLocalDevelopment
    ? requestOrigin
    : "https://www.getpricepeek.com";

  return new URL(path, origin).toString();
}

export function requiresBillingManagement(status: unknown) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    status === "paused"
  );
}
