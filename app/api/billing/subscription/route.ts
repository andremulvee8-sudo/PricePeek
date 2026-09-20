import { NextResponse } from "next/server";
import { authenticateBillingRequest } from "../../../lib/billingAuth";
import {
  loadStripeBillingState,
  loadSubscriptionAccess,
} from "../../../lib/billingData";

export async function GET(request: Request) {
  const user = await authenticateBillingRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to view your plan." }, { status: 401 });
  }

  try {
    const [subscription, billing] = await Promise.all([
      loadSubscriptionAccess(user.id),
      loadStripeBillingState(user.id),
    ]);
    return NextResponse.json({
      subscription,
      billingStatus: billing.status,
      canManageBilling: Boolean(billing.customerId),
    });
  } catch (error) {
    console.error("Subscription load failed:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Could not load your plan right now." },
      { status: 500 }
    );
  }
}
