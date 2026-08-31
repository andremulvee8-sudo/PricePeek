import { NextResponse } from "next/server";
import { resolveRequestOwner } from "../../../lib/requestOwner";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { deviceId, subscription } = await request.json();
    const owner = await resolveRequestOwner(request, deviceId);

    if (
      !owner ||
      typeof deviceId !== "string" ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          device_id: deviceId,
          owner_user_id: owner.kind === "user" ? owner.userId : null,
          subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "device_id" }
      );

    if (error) {
  console.error("Supabase subscription error:", {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
    },
    { status: 500 }
  );
}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { deviceId } = await request.json();
    const owner = await resolveRequestOwner(request, deviceId);

    if (!owner || owner.kind !== "user" || typeof deviceId !== "string") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .update({ owner_user_id: null })
      .eq("device_id", deviceId)
      .eq("owner_user_id", owner.userId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push sign-out cleanup error:", error);
    return NextResponse.json(
      { error: "Could not detach this device from the account" },
      { status: 500 }
    );
  }
}
