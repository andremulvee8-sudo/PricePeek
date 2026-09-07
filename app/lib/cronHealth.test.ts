import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCronHealth, summarizeCronResults } from "./cronHealth.ts";

test("summarizes successful, partial, and failed cron runs without record data", () => {
  assert.deepEqual(
    summarizeCronResults([
      { status: "price-updated" },
      { status: "notification-sent" },
      { status: "subscription-not-found" },
    ]),
    {
      status: "succeeded",
      checkedCount: 3,
      updatedCount: 3,
      notificationCount: 1,
      failureCount: 0,
      lookupFailureCount: 0,
      notificationAttemptCount: 0,
      notificationDeliveredCount: 0,
      pushFailureCount: 0,
      expiredSubscriptionCount: 0,
    }
  );

  assert.equal(
    summarizeCronResults([
      { status: "price-updated" },
      { status: "price-check-failed" },
    ]).status,
    "partial"
  );
  assert.equal(
    summarizeCronResults([{ status: "price-check-failed" }]).status,
    "failed"
  );
});

test("summarizes privacy-safe lookup and push delivery counters", () => {
  assert.deepEqual(
    summarizeCronResults([
      { status: "price-check-failed" },
      {
        status: "notification-sent",
        notificationAttemptCount: 3,
        notificationDeliveredCount: 1,
        pushFailureCount: 1,
        expiredSubscriptionCount: 1,
      },
    ]),
    {
      status: "partial",
      checkedCount: 2,
      updatedCount: 1,
      notificationCount: 1,
      failureCount: 2,
      lookupFailureCount: 1,
      notificationAttemptCount: 3,
      notificationDeliveredCount: 1,
      pushFailureCount: 1,
      expiredSubscriptionCount: 1,
    }
  );
});

test("reports fresh successful runs as healthy", () => {
  const now = new Date("2026-09-03T12:00:00.000Z");
  assert.deepEqual(
    evaluateCronHealth(
      {
        status: "succeeded",
        started_at: "2026-09-03T08:59:00.000Z",
        completed_at: "2026-09-03T09:01:00.000Z",
      },
      now
    ),
    { state: "healthy", reason: "last-run-succeeded" }
  );
});

test("reports missing, stale, partial, and stalled runs as degraded", () => {
  const now = new Date("2026-09-03T12:00:00.000Z");
  assert.equal(evaluateCronHealth(null, now).state, "degraded");
  assert.equal(
    evaluateCronHealth(
      {
        status: "succeeded",
        started_at: "2026-09-01T08:59:00.000Z",
        completed_at: "2026-09-01T09:01:00.000Z",
      },
      now
    ).reason,
    "last-run-stale"
  );
  assert.equal(
    evaluateCronHealth(
      {
        status: "partial",
        started_at: "2026-09-03T08:59:00.000Z",
        completed_at: "2026-09-03T09:01:00.000Z",
      },
      now
    ).reason,
    "last-run-partial"
  );
  assert.equal(
    evaluateCronHealth(
      {
        status: "running",
        started_at: "2026-09-03T11:40:00.000Z",
        completed_at: null,
      },
      now
    ).reason,
    "run-stalled"
  );
});
