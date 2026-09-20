import assert from "node:assert/strict";
import test from "node:test";
import {
  getSubscriptionAccess,
  hasReachedTrackedProductLimit,
  SUBSCRIPTION_PLANS,
} from "./subscription.ts";

const NOW = new Date("2026-09-19T12:00:00.000Z");

test("defaults safely to the free plan when no subscription exists", () => {
  assert.deepEqual(getSubscriptionAccess(null, NOW), {
    plan: "free",
    status: "inactive",
    isPaid: false,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    trackedProductLimit: SUBSCRIPTION_PLANS.free.trackedProductLimit,
    checkIntervalHours: SUBSCRIPTION_PLANS.free.checkIntervalHours,
  });
});

test("grants Plus access for an active unexpired subscription", () => {
  const access = getSubscriptionAccess(
    {
      plan: "plus",
      status: "active",
      currentPeriodEnd: "2026-10-19T12:00:00.000Z",
    },
    NOW
  );

  assert.equal(access.plan, "plus");
  assert.equal(access.status, "active");
  assert.equal(access.isPaid, true);
  assert.equal(access.trackedProductLimit, 20);
  assert.equal(access.checkIntervalHours, 24);
});

test("enforces the selected plan product limit", () => {
  const free = getSubscriptionAccess(null, NOW);
  const plus = getSubscriptionAccess(
    {
      plan: "plus",
      status: "active",
      currentPeriodEnd: "2026-10-19T12:00:00.000Z",
    },
    NOW
  );

  assert.equal(hasReachedTrackedProductLimit(4, free), false);
  assert.equal(hasReachedTrackedProductLimit(5, free), true);
  assert.equal(hasReachedTrackedProductLimit(19, plus), false);
  assert.equal(hasReachedTrackedProductLimit(20, plus), true);
});

test("keeps access through the paid period when cancellation is scheduled", () => {
  const access = getSubscriptionAccess(
    {
      plan: "plus",
      status: "active",
      currentPeriodEnd: "2026-10-19T12:00:00.000Z",
      cancelAtPeriodEnd: true,
    },
    NOW
  );

  assert.equal(access.plan, "plus");
  assert.equal(access.cancelAtPeriodEnd, true);
});

test("falls back to free when a paid period has ended", () => {
  const access = getSubscriptionAccess(
    {
      plan: "plus",
      status: "active",
      currentPeriodEnd: "2026-09-18T12:00:00.000Z",
    },
    NOW
  );

  assert.equal(access.plan, "free");
  assert.equal(access.status, "inactive");
  assert.equal(access.isPaid, false);
});

test("does not grant paid access for billing or malformed states", () => {
  for (const subscription of [
    { plan: "plus", status: "past_due" },
    { plan: "plus", status: "canceled" },
    { plan: "plus", status: "active" },
    { plan: "enterprise", status: "active" },
    { plan: "plus", status: "unknown" },
  ]) {
    assert.equal(getSubscriptionAccess(subscription, NOW).plan, "free");
  }
});
