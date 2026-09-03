import { NextResponse } from "next/server";
import { isAccountDeletionConfirmed } from "../../lib/accountDeletion";
import { getBearerToken } from "../../lib/ownership";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function DELETE(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let confirmationEmail: unknown;

  try {
    ({ confirmationEmail } = await request.json());
  } catch {
    return NextResponse.json(
      { error: "Enter the signed-in email address to confirm deletion." },
      { status: 400 }
    );
  }

  if (!isAccountDeletionConfirmed(data.user.email, confirmationEmail)) {
    return NextResponse.json(
      { error: "The confirmation email does not match this account." },
      { status: 400 }
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
