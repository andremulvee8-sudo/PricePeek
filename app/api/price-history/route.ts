import { NextResponse } from "next/server";
import { getOwnerColumn } from "../../lib/ownership";
import { resolveRequestOwner } from "../../lib/requestOwner";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const productId = searchParams.get("productId");
    const deviceId = searchParams.get("deviceId");
    const owner = await resolveRequestOwner(request, deviceId);

    if (!productId || !deviceId || !owner) {
      return NextResponse.json(
        { error: "Product ID and device ID are required" },
        { status: 400 }
      );
    }

    const ownerColumn = getOwnerColumn(owner);
    let productQuery = supabaseAdmin
        .from("tracked_products")
        .select("id")
        .eq("id", productId)
        .eq(ownerColumn.column, ownerColumn.value);

    if (owner.kind === "device") {
      productQuery = productQuery.is("owner_user_id", null);
    }

    const { data: trackedProduct, error: productError } =
      await productQuery.single();

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
      console.error("Price-history load failed:", { code: error.code });
      return NextResponse.json(
        { error: "Could not load price history." },
        { status: 500 }
      );
    }

    const history = (data ?? []).map((item) => ({
      price: Number(item.price),
      checkedAt: item.checked_at,
    }));
    const lowestPrice =
      history.length > 0
        ? Math.min(...history.map((item) => item.price))
        : null;

    return NextResponse.json({
      success: true,
      history,
      lowestPrice,
    });
  } catch (error) {
    console.error("Price history error:", error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
