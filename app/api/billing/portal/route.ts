import { NextResponse } from "next/server";
import { getBillingReturnUrl } from "../../../lib/billing";
import { authenticateBillingRequest } from "../../../lib/billingAuth";
import { findStripeCustomerId } from "../../../lib/billingData";
import { getStripeClient } from "../../../lib/stripeServer";

export async function POST(request: Request) {
  const user = await authenticateBillingRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
  }

  try {
    const customerId = await findStripeCustomerId(user.id);

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account is linked to this user." },
        { status: 404 }
      );
    }

    const session = await getStripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: getBillingReturnUrl(request.url, "/plans"),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal creation failed:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Billing management is not available right now." },
      { status: 503 }
    );
  }
}
