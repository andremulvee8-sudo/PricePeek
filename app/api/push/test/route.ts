import { NextResponse } from "next/server";
import webPush from "web-push";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { deviceId } = await request.json();

    if (typeof deviceId !== "string") {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      return NextResponse.json(
        { error: "VAPID configuration is missing" },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("subscription")
      .eq("device_id", deviceId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Push subscription not found" },
        { status: 404 }
      );
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);

    await webPush.sendNotification(
      data.subscription,
      JSON.stringify({
        title: "PricePeek test alert 🔔",
        body: "Browser notifications are working!",
        url: "/",
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Test notification error:", error);

    return NextResponse.json(
      { error: "Could not send test notification" },
      { status: 500 }
    );
  }
}