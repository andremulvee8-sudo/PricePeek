import { NextResponse } from "next/server";
import { isAccountDeletionConfirmed } from "../../lib/accountDeletion";
import { readJsonObject } from "../../lib/apiRequest";
import { getBearerToken } from "../../lib/ownership";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { requiresBillingManagement } from "../../lib/billing";
import { loadStripeBillingState } from "../../lib/billingData";

export async function DELETE(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return NextResponse.json(
      { error: "Enter the signed-in email address to confirm deletion." },
      { status: body.status }
    );
  }

  const { confirmationEmail } = body.data;

  if (!isAccountDeletionConfirmed(data.user.email, confirmationEmail)) {
    return NextResponse.json(
      { error: "The confirmation email does not match this account." },
      { status: 400 }
    );
  }

  try {
    const billing = await loadStripeBillingState(data.user.id);

    if (requiresBillingManagement(billing.status)) {
      return NextResponse.json(
        {
          error:
            "Cancel the active subscription from Plans → Manage billing, then delete the account after the subscription ends.",
        },
        { status: 409 }
      );
    }
  } catch (billingError) {
    console.error("Account billing check failed:", {
      message:
        billingError instanceof Error ? billingError.message : "unknown",
    });
    return NextResponse.json(
      { error: "Could not verify billing status. Please try again later." },
      { status: 503 }
    );
  }

  const { error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(
    data.user.id
  );

  if (deletionError) {
    console.error("Account deletion failed:", {
      status: deletionError.status,
      code: deletionError.code,
    });
    return NextResponse.json(
      { error: "Could not delete the account. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
