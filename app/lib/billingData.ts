import "server-only";

import type Stripe from "stripe";
import {
  getStripeId,
  getStripeSubscriptionPeriodEnd,
  mapStripeSubscriptionStatus,
} from "./billing";
import { getSubscriptionAccess } from "./subscription";
import { supabaseAdmin } from "./supabaseAdmin";

export async function loadSubscriptionAccess(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return getSubscriptionAccess(
    data
      ? {
          plan: data.plan,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          cancelAtPeriodEnd: data.cancel_at_period_end,
        }
      : null
  );
}

export async function findStripeCustomerId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.provider_customer_id === "string"
    ? data.provider_customer_id
    : null;
}

export async function loadStripeBillingState(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_subscriptions")
    .select("status, provider_customer_id, provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    status: data?.status ?? "inactive",
    customerId:
      typeof data?.provider_customer_id === "string"
        ? data.provider_customer_id
        : null,
    subscriptionId:
      typeof data?.provider_subscription_id === "string"
        ? data.provider_subscription_id
        : null,
  };
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  knownUserId?: string
) {
  const customerId = getStripeId(subscription.customer);
  const subscriptionId = subscription.id;
  let userId = knownUserId;

  if (!userId) {
    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("user_id")
      .or(
        `provider_subscription_id.eq.${subscriptionId},provider_customer_id.eq.${customerId ?? "__missing__"}`
      )
      .maybeSingle();

    if (error) throw new Error(error.message);
    userId = data?.user_id;
  }

  if (!userId || !customerId) {
    throw new Error("Stripe subscription is not linked to a PricePeek user.");
  }

  const { error } = await supabaseAdmin.from("user_subscriptions").upsert(
    {
      user_id: userId,
      plan: "plus",
      status: mapStripeSubscriptionStatus(subscription.status),
      provider: "stripe",
      provider_customer_id: customerId,
      provider_subscription_id: subscriptionId,
      current_period_end: getStripeSubscriptionPeriodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);
}
