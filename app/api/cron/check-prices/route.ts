import { NextResponse } from "next/server";
import webPush from "web-push";
import {
  formatCurrency,
  parseAmazonProductUrl,
} from "../../../lib/amazonProduct";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  getNextFailedCheckAt,
  getNextSuccessfulCheckAt,
  PRICE_CHECK_BATCH_SIZE,
  shouldSendPriceAlert,
} from "../../../lib/priceCheckScheduling";
import { isExpiredPushSubscriptionError } from "../../../lib/pushDelivery";

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

  const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc(
    "acquire_price_check_lock",
    { lock_duration_seconds: maxDuration }
  );

  if (lockError) {
    console.error("Could not acquire the price-check lock:", lockError.message);
    return NextResponse.json(
      { error: "Could not start the scheduled price check" },
      { status: 500 }
    );
  }

  if (!lockAcquired) {
    return NextResponse.json({
      success: true,
      checked: 0,
      skipped: "already-running",
      results: [],
    });
  }

  const checkStartedAt = new Date();

  const { data: products, error } = await supabaseAdmin
    .from("tracked_products")
    .select(
      "id, device_id, owner_user_id, amazon_url, title, currency, current_price, target_price, notification_sent, consecutive_failures"
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
        const currency =
          product.currency ||
          parseAmazonProductUrl(product.amazon_url)?.currency;
        let subscriptionQuery = supabaseAdmin
          .from("push_subscriptions")
          .select("device_id, owner_user_id, subscription");

        subscriptionQuery = product.owner_user_id
          ? subscriptionQuery.eq("owner_user_id", product.owner_user_id)
          : subscriptionQuery.eq("device_id", product.device_id);

        const { data: pushRecords, error: subscriptionError } =
          await subscriptionQuery;

        if (subscriptionError) {
          console.error("Could not load push subscriptions:", {
            id: product.id,
            message: subscriptionError.message,
          });
          results.push({
            id: product.id,
            status: "subscription-lookup-failed",
          });
          continue;
        }

        if (!pushRecords || pushRecords.length === 0) {
          results.push({
            id: product.id,
            status: "subscription-not-found",
          });
          continue;
        }

        const notificationPayload = JSON.stringify({
          title: "Price drop on PricePeek! 🎉",
          body: `${product.title} is now ${
            currency
              ? formatCurrency(currentPrice, currency)
              : `${currentPrice.toFixed(2)} (currency unavailable)`
          }.`,
          url: product.amazon_url,
        });

        const deliveryResults = await Promise.allSettled(
          pushRecords.map((pushRecord) =>
            webPush.sendNotification(
              pushRecord.subscription,
              notificationPayload
            )
          )
        );

        let deliveredCount = 0;
        let transientFailureCount = 0;

        for (const [index, deliveryResult] of deliveryResults.entries()) {
          if (deliveryResult.status === "fulfilled") {
            deliveredCount += 1;
            continue;
          }

          const pushRecord = pushRecords[index];
          if (isExpiredPushSubscriptionError(deliveryResult.reason)) {
            let deleteQuery = supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("device_id", pushRecord.device_id);

            deleteQuery = pushRecord.owner_user_id
              ? deleteQuery.eq("owner_user_id", pushRecord.owner_user_id)
              : deleteQuery.is("owner_user_id", null);

            const { error: deleteError } = await deleteQuery;

            if (deleteError) {
              console.error("Could not remove an expired push subscription:", {
                id: product.id,
                message: deleteError.message,
              });
            }
            continue;
          }

          transientFailureCount += 1;
          console.error("Push notification delivery failed:", {
            id: product.id,
          });
        }

        if (deliveredCount === 0) {
          results.push({
            id: product.id,
            status:
              transientFailureCount > 0
                ? "notification-delivery-failed"
                : "subscription-not-found",
          });
          continue;
        }

        const { error: notificationUpdateError } = await supabaseAdmin
          .from("tracked_products")
          .update({
            notification_sent: true,
          })
          .eq("id", product.id);

        if (notificationUpdateError) {
          console.error("Could not record notification delivery:", {
            id: product.id,
            message: notificationUpdateError.message,
          });
          results.push({
            id: product.id,
            status: "notification-state-update-failed",
            deliveredCount,
          });
          continue;
        }

        results.push({
          id: product.id,
          status: "notification-sent",
          currentPrice,
          deliveredCount,
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
