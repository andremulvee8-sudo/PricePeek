import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { deviceId, subscription } = await request.json();

    if (
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