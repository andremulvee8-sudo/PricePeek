import { NextResponse } from "next/server";
import { parseAmazonProductUrl } from "../../lib/amazonProduct";
import { calculateDealStatus } from "../../lib/productInsights";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { deviceId, product, targetPrice } = await request.json();
    const parsedProduct =
      typeof product?.url === "string"
        ? parseAmazonProductUrl(product.url)
        : null;

    if (
      typeof deviceId !== "string" ||
      deviceId.trim().length === 0 ||
      !product ||
      typeof product.title !== "string" ||
      !parsedProduct ||
      typeof targetPrice !== "number" ||
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid tracked product" },
        { status: 400 }
      );
    }

    const { data: existingProduct, error: existingProductError } =
      await supabaseAdmin
        .from("tracked_products")
        .select("id")
        .eq("device_id", deviceId)
        .eq("marketplace", parsedProduct.marketplace)
        .eq("asin", parsedProduct.asin)
        .maybeSingle();

    if (existingProductError) {
      throw new Error(existingProductError.message);
    }

    if (existingProduct) {
      return NextResponse.json(
        {
          error: "This product is already being tracked.",
          id: existingProduct.id,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tracked_products")
      .insert({
        device_id: deviceId,
        amazon_url: parsedProduct.canonicalUrl,
        marketplace: parsedProduct.marketplace,
        asin: parsedProduct.asin,
        currency: parsedProduct.currency,
        title: product.title,
        image_url: product.image,
        current_price: product.currentPrice,
        target_price: targetPrice,
        last_checked_at: new Date().toISOString(),
        next_check_at: new Date().toISOString(),
        is_active: true,
        notification_sent: false,
        consecutive_failures: 0,
        last_check_error: null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This product is already being tracked." },
          { status: 409 }
        );
      }

      console.error("Tracked product error:", {
        message: error.message,
        code: error.code,
      });

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }

    if (
      typeof product.currentPrice === "number" &&
      Number.isFinite(product.currentPrice)
    ) {
      const { error: historyError } = await supabaseAdmin
        .from("price_history")
        .insert({
          tracked_product_id: data.id,
          price: product.currentPrice,
        });

      if (historyError) {
        console.error("Initial price history error:", {
          productId: data.id,
          message: historyError.message,
        });
      }
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

export async function PATCH(request: Request) {
  try {
    const { deviceId, id, targetPrice, isActive, rearmAlert } =
      await request.json();

    if (
      typeof deviceId !== "string" ||
      deviceId.trim().length === 0 ||
      typeof id !== "string"
    ) {
      return NextResponse.json(
        { error: "Device ID and product ID are required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (targetPrice !== undefined) {
      if (
        typeof targetPrice !== "number" ||
        !Number.isFinite(targetPrice) ||
        targetPrice <= 0
      ) {
        return NextResponse.json(
          { error: "Target price must be greater than zero" },
          { status: 400 }
        );
      }

      updates.target_price = targetPrice;
      updates.notification_sent = false;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return NextResponse.json(
          { error: "Tracking state must be a boolean" },
          { status: 400 }
        );
      }

      updates.is_active = isActive;

      if (isActive) updates.next_check_at = new Date().toISOString();
    }

    if (rearmAlert !== undefined) {
      if (rearmAlert !== true) {
        return NextResponse.json(
          { error: "Re-arm flag must be true" },
          { status: 400 }
        );
      }

      updates.notification_sent = false;
      updates.next_check_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No tracking changes were provided" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("tracked_products")
      .update(updates)
      .eq("id", id)
      .eq("device_id", deviceId)
      .select("target_price, is_active, notification_sent")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Tracked product not found" },
        { status: error?.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        targetPrice: Number(data.target_price),
        isActive: data.is_active,
        notificationSent: data.notification_sent,
      },
    });
  } catch (error) {
    console.error("Update tracked product error:", error);

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
        "id, amazon_url, marketplace, asin, currency, title, image_url, current_price, target_price, is_active, notification_sent"
      )
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const productIds = (data ?? []).map((item) => item.id);
    const historyByProduct = new Map<string, number[]>();

    if (productIds.length > 0) {
      const { data: historyData, error: historyError } = await supabaseAdmin
        .from("price_history")
        .select("tracked_product_id, price")
        .in("tracked_product_id", productIds);

      if (historyError) {
        return NextResponse.json(
          { error: historyError.message },
          { status: 500 }
        );
      }

      for (const historyItem of historyData ?? []) {
        const prices = historyByProduct.get(historyItem.tracked_product_id) ?? [];
        prices.push(Number(historyItem.price));
        historyByProduct.set(historyItem.tracked_product_id, prices);
      }
    }

    const products = (data ?? []).map((item) => {
      const parsedUrl = parseAmazonProductUrl(item.amazon_url);
      const currentPrice =
        item.current_price == null ? null : Number(item.current_price);
      const history = historyByProduct.get(item.id) ?? [];
      const dealStatus = calculateDealStatus(currentPrice, history);

      return {
        databaseId: item.id,
        url: parsedUrl?.canonicalUrl ?? item.amazon_url,
        marketplace: item.marketplace ?? parsedUrl?.marketplace,
        asin: item.asin ?? parsedUrl?.asin,
        currency: item.currency ?? parsedUrl?.currency ?? "USD",
        title: item.title,
        image: item.image_url,
        currentPrice,
        lowestPrice: dealStatus.historicalMinimum,
        rating: null,
        targetPrice: Number(item.target_price),
        isActive: item.is_active,
        notificationSent: item.notification_sent,
        dealStatus,
      };
    });

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
