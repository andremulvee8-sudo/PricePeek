import { NextResponse } from "next/server";
import {
  getBillingReturnUrl,
  requiresBillingManagement,
} from "../../../lib/billing";
import { authenticateBillingRequest } from "../../../lib/billingAuth";
import {
  findStripeCustomerId,
  loadStripeBillingState,
  loadSubscriptionAccess,
} from "../../../lib/billingData";
import { getStripeClient, getStripePriceId } from "../../../lib/stripeServer";

export async function POST(request: Request) {
  const user = await authenticateBillingRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in before upgrading." }, { status: 401 });
  }

  try {
    const [access, billing] = await Promise.all([
      loadSubscriptionAccess(user.id),
      loadStripeBillingState(user.id),
    ]);

    if (access.isPaid || requiresBillingManagement(billing.status)) {
      return NextResponse.json(
        { error: "Your Plus subscription is already active. Use Manage billing instead." },
        { status: 409 }
      );
    }

    const customerId = await findStripeCustomerId(user.id);
    const session = await getStripeClient().checkout.sessions.create({
      mode: "subscription",
      managed_payments: { enabled: true },
      line_items: [{ price: getStripePriceId(), quantity: 1 }],
      success_url: getBillingReturnUrl(request.url, "/plans?checkout=success"),
      cancel_url: getBillingReturnUrl(request.url, "/plans?checkout=canceled"),
      client_reference_id: user.id,
      ...(customerId ? { customer: customerId } : { customer_email: user.email }),
      metadata: { pricepeek_user_id: user.id },
      subscription_data: {
        metadata: { pricepeek_user_id: user.id },
      },
    });

    if (!session.url) throw new Error("Stripe checkout URL was missing.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Checkout is not available right now." },
      { status: 503 }
    );
  }
}
