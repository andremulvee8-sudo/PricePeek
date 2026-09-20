import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { isUserId } from "../../../lib/billing";
import { syncStripeSubscription } from "../../../lib/billingData";
import {
  getStripeClient,
  getStripeWebhookSecret,
} from "../../../lib/stripeServer";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

async function wasEventProcessed(eventId: string) {
  const { data, error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function markEventProcessed(event: Stripe.Event) {
  const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  if (error && error.code !== "23505") throw new Error(error.message);
}

async function processEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    if (!isUserId(userId) || !subscriptionId) {
      throw new Error("Completed checkout is missing a valid user or subscription.");
    }

    const subscription = await getStripeClient().subscriptions.retrieve(
      subscriptionId
    );
    await syncStripeSubscription(subscription, userId);
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const metadataUserId = subscription.metadata.pricepeek_user_id;
    await syncStripeSubscription(
      subscription,
      isUserId(metadataUserId) ? metadataUserId : undefined
    );
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    if (await wasEventProcessed(event.id)) {
      return NextResponse.json({ received: true });
    }

    await processEvent(event);
    await markEventProcessed(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
