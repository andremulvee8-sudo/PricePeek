import { NextResponse } from "next/server";
import webPush from "web-push";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  getNextFailedCheckAt,
  getNextSuccessfulCheckAt,
  PRICE_CHECK_BATCH_SIZE,
  shouldSendPriceAlert,
} from "../../../lib/priceCheckScheduling";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const rainforestApiKey = process.env.RAINFOREST_API_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!rainforestApiKey || !publicKey || !privateKey || !subject) {
    return NextResponse.json(
      { error: "Server configuration is incomplete" },
      { status: 500 }
    );
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);

  const checkStartedAt = new Date();

  const { data: products, error } = await supabaseAdmin
    .from("tracked_products")
    .select(
      "id, device_id, amazon_url, title, current_price, target_price, notification_sent, consecutive_failures"
    )
    .eq("is_active", true)
    .lte("next_check_at", checkStartedAt.toISOString())
    .order("next_check_at", { ascending: true })
    .limit(PRICE_CHECK_BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const results = [];

  for (const product of products ?? []) {
    const checkedAt = new Date();

    async function recordFailure(message: string) {
      const consecutiveFailures = Number(product.consecutive_failures ?? 0) + 1;
      const { error: failureUpdateError } = await supabaseAdmin
        .from("tracked_products")
        .update({
          last_checked_at: checkedAt.toISOString(),
          next_check_at: getNextFailedCheckAt(checkedAt, consecutiveFailures),
          consecutive_failures: consecutiveFailures,
          last_check_error: message.slice(0, 1000),
        })
        .eq("id", product.id);

      if (failureUpdateError) {
        console.error("Could not record price-check failure:", {
          id: product.id,
          message: failureUpdateError.message,
        });
      }
    }

    try {
      const params = new URLSearchParams({
        api_key: rainforestApiKey,
        type: "product",
        url: product.amazon_url,
      });

      const response = await fetch(
        `https://api.rainforestapi.com/request?${params.toString()}`,
        { cache: "no-store" }
      );

      const rainforestData = await response.json();

      const currentPrice =
        rainforestData?.product?.buybox_winner?.price?.value ??
        rainforestData?.product?.price?.value ??
        null;

      if (!response.ok || typeof currentPrice !== "number") {
        const errorMessage =
          rainforestData?.request_info?.message ||
          rainforestData?.error ||
          `Rainforest lookup failed with status ${response.status}`;

        await recordFailure(errorMessage);
        results.push({
          id: product.id,
          status: "price-check-failed",
          error: errorMessage,
        });
        continue;
      }

      const targetPrice = Number(product.target_price);
      const notificationSent = Boolean(product.notification_sent);
      const shouldRearmNotification =
        currentPrice > targetPrice && notificationSent;

      const { error: updateError } = await supabaseAdmin
        .from("tracked_products")
        .update({
          current_price: currentPrice,
          last_checked_at: checkedAt.toISOString(),
          next_check_at: getNextSuccessfulCheckAt(checkedAt),
          consecutive_failures: 0,
          last_check_error: null,
          ...(shouldRearmNotification
            ? { notification_sent: false }
            : {}),
        })
        .eq("id", product.id);

      if (updateError) {
        results.push({
          id: product.id,
          status: "product-update-failed",
          error: updateError.message,
        });
        continue;
      }

      const { error: historyError } = await supabaseAdmin
        .from("price_history")
        .insert({
          tracked_product_id: product.id,
          price: currentPrice,
        });

      if (historyError) {
        results.push({
          id: product.id,
          status: "history-save-failed",
          error: historyError.message,
        });
        continue;
      }

      if (
        shouldSendPriceAlert(
          currentPrice,
          targetPrice,
          notificationSent
        )
      ) {
        const { data: pushRecord } = await supabaseAdmin
          .from("push_subscriptions")
          .select("subscription")
          .eq("device_id", product.device_id)
          .single();

        if (!pushRecord?.subscription) {
          results.push({
            id: product.id,
            status: "subscription-not-found",
          });
          continue;
        }

        await webPush.sendNotification(
          pushRecord.subscription,
          JSON.stringify({
            title: "Price drop on PricePeek! 🎉",
            body: `${product.title} is now €${currentPrice.toFixed(2)}.`,
            url: product.amazon_url,
          })
        );

        await supabaseAdmin
          .from("tracked_products")
          .update({
            notification_sent: true,
          })
          .eq("id", product.id);

        results.push({
          id: product.id,
          status: "notification-sent",
          currentPrice,
        });
      } else {
        results.push({
          id: product.id,
          status: "price-updated",
          currentPrice,
        });
      }
    } catch (error) {
      console.error("Price check failed:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unexpected price-check error";
      await recordFailure(errorMessage);

      results.push({
        id: product.id,
        status: "unexpected-error",
        error: errorMessage,
      });
    }
  }

  return NextResponse.json({
    success: true,
    checked: results.length,
    results,
  });
}
