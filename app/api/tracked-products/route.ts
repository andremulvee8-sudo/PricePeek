import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

function extractAsin(amazonUrl: string) {
  const match = amazonUrl.match(
    /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i
  );

  return match?.[1]?.toUpperCase() || null;
}

export async function POST(request: Request) {
  try {
    const { deviceId, product, targetPrice } = await request.json();

    if (
      typeof deviceId !== "string" ||
      !product ||
      typeof product.title !== "string" ||
      typeof product.url !== "string" ||
      typeof targetPrice !== "number" ||
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid tracked product" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tracked_products")
      .insert({
        device_id: deviceId,
        amazon_url: product.url,
        asin: extractAsin(product.url),
        title: product.title,
        image_url: product.image,
        current_price: product.currentPrice,
        target_price: targetPrice,
        last_checked_at: new Date().toISOString(),
        notification_sent: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Tracked product error:", {
        message: error.message,
        code: error.code,
      });

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error("Tracked product route error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
export async function DELETE(request: Request) {
  try {
    const { deviceId, id } = await request.json();

    if (typeof deviceId !== "string" || typeof id !== "string") {
      return NextResponse.json(
        { error: "Device ID and product ID are required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("tracked_products")
      .delete()
      .eq("id", id)
      .eq("device_id", deviceId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove tracked product error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}