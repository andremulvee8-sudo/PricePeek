export const CRON_HEALTH_STALE_AFTER_MS = 36 * 60 * 60 * 1000;

export type CronRunStatus = "running" | "succeeded" | "partial" | "failed";

type CronResult = {
  status: string;
  notificationAttemptCount?: number;
  notificationDeliveredCount?: number;
  pushFailureCount?: number;
  expiredSubscriptionCount?: number;
};

type StoredCronRun = {
  status: CronRunStatus;
  started_at: string;
  completed_at: string | null;
};

const UPDATED_PRICE_STATUSES = new Set([
  "price-updated",
  "notification-sent",
  "subscription-not-found",
  "notification-delivery-failed",
  "notification-state-update-failed",
]);

const FAILURE_STATUSES = new Set([
  "price-check-failed",
  "product-update-failed",
  "history-save-failed",
  "subscription-lookup-failed",
  "notification-delivery-failed",
  "notification-state-update-failed",
  "unexpected-error",
]);

export function summarizeCronResults(results: CronResult[]) {
  const updatedCount = results.filter((result) =>
    UPDATED_PRICE_STATUSES.has(result.status)
  ).length;
  const notificationCount = results.filter(
    (result) => result.status === "notification-sent"
  ).length;
  const productFailureCount = results.filter((result) =>
    FAILURE_STATUSES.has(result.status)
  ).length;
  const lookupFailureCount = results.filter(
    (result) =>
      result.status === "price-check-failed" ||
      result.status === "unexpected-error"
  ).length;
  const notificationAttemptCount = sumResultCount(
    results,
    "notificationAttemptCount"
  );
  const notificationDeliveredCount = sumResultCount(
    results,
    "notificationDeliveredCount"
  );
  const pushFailureCount = sumResultCount(results, "pushFailureCount");
  const expiredSubscriptionCount = sumResultCount(
    results,
    "expiredSubscriptionCount"
  );
  const failureCount = productFailureCount + pushFailureCount;

  const status: Exclude<CronRunStatus, "running"> =
    failureCount === 0
      ? "succeeded"
      : updatedCount > 0
        ? "partial"
        : "failed";

  return {
    status,
    checkedCount: results.length,
    updatedCount,
    notificationCount,
    failureCount,
    lookupFailureCount,
    notificationAttemptCount,
    notificationDeliveredCount,
    pushFailureCount,
    expiredSubscriptionCount,
  };
}

function sumResultCount(
  results: CronResult[],
  key:
    | "notificationAttemptCount"
    | "notificationDeliveredCount"
    | "pushFailureCount"
    | "expiredSubscriptionCount"
) {
  return results.reduce((total, result) => {
    const value = result[key];
    return total +
      (typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.floor(value)
        : 0);
  }, 0);
}

export function evaluateCronHealth(
  run: StoredCronRun | null,
  now = new Date()
) {
  if (!run) {
    return { state: "degraded" as const, reason: "no-recorded-run" as const };
  }

  if (run.status === "running") {
    const runningFor = now.getTime() - new Date(run.started_at).getTime();

    return runningFor <= 10 * 60 * 1000
      ? { state: "checking" as const, reason: "run-in-progress" as const }
      : { state: "degraded" as const, reason: "run-stalled" as const };
  }

  const completedAt = run.completed_at
    ? new Date(run.completed_at).getTime()
    : Number.NaN;

  if (!Number.isFinite(completedAt)) {
    return { state: "degraded" as const, reason: "missing-completion" as const };
  }

  if (now.getTime() - completedAt > CRON_HEALTH_STALE_AFTER_MS) {
    return { state: "degraded" as const, reason: "last-run-stale" as const };
  }

  if (run.status === "failed" || run.status === "partial") {
    return {
      state: "degraded" as const,
      reason: run.status === "failed" ? "last-run-failed" as const : "last-run-partial" as const,
    };
  }

  return { state: "healthy" as const, reason: "last-run-succeeded" as const };
}
