import { NextResponse } from "next/server";
import { parseAmazonProductUrl } from "../../lib/amazonProduct";
import { readJsonObject } from "../../lib/apiRequest";
import { calculateDealStatus } from "../../lib/productInsights";
import { getOwnerColumn } from "../../lib/ownership";
import { resolveRequestOwner } from "../../lib/requestOwner";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);

    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const { deviceId, targetPrice } = body.data;
    const product =
      body.data.product &&
      typeof body.data.product === "object" &&
      !Array.isArray(body.data.product)
        ? (body.data.product as Record<string, unknown>)
        : null;
    const owner = await resolveRequestOwner(request, deviceId);
    const parsedProduct =
      typeof product?.url === "string"
        ? parseAmazonProductUrl(product.url)
        : null;

    if (
      !owner ||
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

    const ownerColumn = getOwnerColumn(owner);
    let existingProductQuery = supabaseAdmin
        .from("tracked_products")
        .select("id")
        .eq(ownerColumn.column, ownerColumn.value)
        .eq("marketplace", parsedProduct.marketplace)
        .eq("asin", parsedProduct.asin);

    if (owner.kind === "device") {
      existingProductQuery = existingProductQuery.is("owner_user_id", null);
    }

    const { data: existingProduct, error: existingProductError } =
      await existingProductQuery.maybeSingle();

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
        owner_user_id: owner.kind === "user" ? owner.userId : null,
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
        { error: "Could not save this tracked product." },
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
    const body = await readJsonObject(request);

    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const { deviceId, id, targetPrice, isActive, rearmAlert } = body.data;
    const owner = await resolveRequestOwner(request, deviceId);

    if (
      !owner ||
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

    const ownerColumn = getOwnerColumn(owner);
    let updateQuery = supabaseAdmin
      .from("tracked_products")
      .update(updates)
      .eq("id", id)
      .eq(ownerColumn.column, ownerColumn.value);

    if (owner.kind === "device") {
      updateQuery = updateQuery.is("owner_user_id", null);
    }

    const { data, error } = await updateQuery
      .select("target_price, is_active, notification_sent")
      .single();

    if (error || !data) {
      if (error && error.code !== "PGRST116") {
        console.error("Tracked product update failed:", { code: error.code });
      }

      return NextResponse.json(
        {
          error:
            error?.code === "PGRST116"
              ? "Tracked product not found"
              : "Could not update this tracked product.",
        },
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
    const body = await readJsonObject(request);

    if (!body.ok) {
      return NextResponse.json({ error: body.error }, { status: body.status });
    }

    const { deviceId, id } = body.data;
    const owner = await resolveRequestOwner(request, deviceId);

    if (!owner || typeof deviceId !== "string" || typeof id !== "string") {
      return NextResponse.json(
        { error: "Device ID and product ID are required" },
        { status: 400 }
      );
    }

    const ownerColumn = getOwnerColumn(owner);
    let deleteQuery = supabaseAdmin
      .from("tracked_products")
      .delete()
      .eq("id", id)
      .eq(ownerColumn.column, ownerColumn.value);

    if (owner.kind === "device") {
      deleteQuery = deleteQuery.is("owner_user_id", null);
    }

    const { error } = await deleteQuery;

    if (error) {
      console.error("Tracked product deletion failed:", { code: error.code });
      return NextResponse.json(
        { error: "Could not remove this tracked product." },
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
    const owner = await resolveRequestOwner(request, deviceId);

    if (!owner || !deviceId) {
      return NextResponse.json(
        { error: "Device ID is required" },
        { status: 400 }
      );
    }

    const ownerColumn = getOwnerColumn(owner);
    let productsQuery = supabaseAdmin
      .from("tracked_products")
      .select(
        "id, amazon_url, marketplace, asin, currency, title, image_url, current_price, target_price, is_active, notification_sent"
      )
      .eq(ownerColumn.column, ownerColumn.value);

    if (owner.kind === "device") {
      productsQuery = productsQuery.is("owner_user_id", null);
    }

    const { data, error } = await productsQuery.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Tracked product load failed:", { code: error.code });
      return NextResponse.json(
        { error: "Could not load tracked products." },
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
        console.error("Tracked product history load failed:", {
          code: historyError.code,
        });
        return NextResponse.json(
          { error: "Could not load tracked-product history." },
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
