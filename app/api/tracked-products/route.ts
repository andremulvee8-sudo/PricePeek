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
export async function GET(request: Request) {
  try {
    const deviceId = new URL(request.url).searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tracked_products")
      .select(
        "id, amazon_url, title, image_url, current_price, target_price"
      )
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const products = (data ?? []).map((item) => ({
      databaseId: item.id,
      url: item.amazon_url,
      title: item.title,
      image: item.image_url,
      currentPrice: item.current_price,
      lowestPrice: null,
      rating: null,
      targetPrice: item.target_price,
    }));

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Load tracked products error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}