import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const productId = searchParams.get("productId");
    const deviceId = searchParams.get("deviceId");

    if (!productId || !deviceId) {
      return NextResponse.json(
        { error: "Product ID and device ID are required" },
        { status: 400 }
      );
    }

    const { data: trackedProduct, error: productError } =
      await supabaseAdmin
        .from("tracked_products")
        .select("id")
        .eq("id", productId)
        .eq("device_id", deviceId)
        .single();

    if (productError || !trackedProduct) {
      return NextResponse.json(
        { error: "Tracked product not found" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("price_history")
      .select("price, checked_at")
      .eq("tracked_product_id", productId)
      .order("checked_at", { ascending: true })
      .limit(30);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const history = (data ?? []).map((item) => ({
      price: Number(item.price),
      checkedAt: item.checked_at,
    }));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Price history error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}