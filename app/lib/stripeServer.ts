import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function requireEnvironmentValue(name: string, prefix: string) {
  const value = process.env[name]?.trim();

  if (!value || !value.startsWith(prefix)) {
    throw new Error(`${name} is not configured correctly.`);
  }

  return value;
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(
      requireEnvironmentValue("STRIPE_SECRET_KEY", "sk_")
    );
  }

  return stripeClient;
}

export function getStripePriceId() {
  return requireEnvironmentValue("STRIPE_PLUS_PRICE_ID", "price_");
}

export function getStripeWebhookSecret() {
  return requireEnvironmentValue("STRIPE_WEBHOOK_SECRET", "whsec_");
}
