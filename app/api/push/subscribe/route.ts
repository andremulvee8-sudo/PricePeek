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
      });

      return NextResponse.json(
        { error: "Could not save this push subscription" },
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
    const { deviceId, action } = await request.json();
    const owner = await resolveRequestOwner(request, deviceId);

    if (!owner || typeof deviceId !== "string" || deviceId.trim().length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (action === "unsubscribe") {
      let deleteQuery = supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("device_id", deviceId);

      deleteQuery =
        owner.kind === "user"
          ? deleteQuery.eq("owner_user_id", owner.userId)
          : deleteQuery.is("owner_user_id", null);

      const { error } = await deleteQuery;
      if (error) throw new Error(error.message);

      return NextResponse.json({ success: true });
    }

    if (owner.kind !== "user") {
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
