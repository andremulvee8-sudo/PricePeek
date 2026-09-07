import "server-only";

import { evaluateCronHealth, type CronRunStatus } from "./cronHealth";
import { supabaseAdmin } from "./supabaseAdmin";

type LatestRun = {
  status: CronRunStatus;
  started_at: string;
  completed_at: string | null;
  checked_count: number;
  updated_count: number;
  notification_count: number;
  failure_count: number;
  lookup_failure_count: number;
  push_attempt_count: number;
  push_delivery_count: number;
  push_failure_count: number;
  expired_subscription_count: number;
};

export async function getPriceCheckHealth() {
  const { data, error } = await supabaseAdmin
    .from("price_check_runs")
    .select(
      "status, started_at, completed_at, checked_count, updated_count, notification_count, failure_count, lookup_failure_count, push_attempt_count, push_delivery_count, push_failure_count, expired_subscription_count"
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestRun>();

  if (error) {
    console.error("Could not read price-check health:", {
      code: error.code,
    });
    return {
      state: "degraded" as const,
      reason: "health-unavailable" as const,
      lastCompletedAt: null,
      latestRun: null,
    };
  }

  const health = evaluateCronHealth(data);

  return {
    ...health,
    lastCompletedAt: data?.completed_at ?? null,
    latestRun: data
      ? {
          checkedCount: Number(data.checked_count ?? 0),
          updatedCount: Number(data.updated_count ?? 0),
          notificationCount: Number(data.notification_count ?? 0),
          failureCount: Number(data.failure_count ?? 0),
          lookupFailureCount: Number(data.lookup_failure_count ?? 0),
          pushAttemptCount: Number(data.push_attempt_count ?? 0),
          pushDeliveryCount: Number(data.push_delivery_count ?? 0),
          pushFailureCount: Number(data.push_failure_count ?? 0),
          expiredSubscriptionCount: Number(
            data.expired_subscription_count ?? 0
          ),
        }
      : null,
  };
}
