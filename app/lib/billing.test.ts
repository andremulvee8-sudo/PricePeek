import assert from "node:assert/strict";
import test from "node:test";
import {
  getBillingReturnUrl,
  getStripeId,
  getStripeSubscriptionPeriodEnd,
  isUserId,
  mapStripeSubscriptionStatus,
  requiresBillingManagement,
} from "./billing.ts";

test("maps every Stripe subscription state to a safe local state", () => {
  assert.equal(mapStripeSubscriptionStatus("active"), "active");
  assert.equal(mapStripeSubscriptionStatus("trialing"), "trialing");
  assert.equal(mapStripeSubscriptionStatus("past_due"), "past_due");
  assert.equal(mapStripeSubscriptionStatus("unpaid"), "past_due");
  assert.equal(mapStripeSubscriptionStatus("incomplete"), "past_due");
  assert.equal(mapStripeSubscriptionStatus("paused"), "paused");
  assert.equal(mapStripeSubscriptionStatus("canceled"), "canceled");
  assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "canceled");
});

test("routes open billing relationships to management instead of another checkout", () => {
  for (const status of ["active", "trialing", "past_due", "paused"]) {
    assert.equal(requiresBillingManagement(status), true);
  }

  assert.equal(requiresBillingManagement("canceled"), false);
  assert.equal(requiresBillingManagement("inactive"), false);
});

test("uses the latest subscription-item period end", () => {
  const value = getStripeSubscriptionPeriodEnd({
    items: {
      data: [{ current_period_end: 1_800_000_000 }, { current_period_end: 1_900_000_000 }],
    },
  } as never);

  assert.equal(value, new Date(1_900_000_000 * 1000).toISOString());
  assert.equal(
    getStripeSubscriptionPeriodEnd({ items: { data: [] } } as never),
    null
  );
});

test("extracts expanded and unexpanded Stripe IDs", () => {
  assert.equal(getStripeId("cus_123"), "cus_123");
  assert.equal(getStripeId({ id: "cus_456" }), "cus_456");
  assert.equal(getStripeId(null), null);
});

test("accepts only UUID-shaped user IDs", () => {
  assert.equal(isUserId("f7f83589-3d64-4c57-946a-5c88b22ad9ad"), true);
  assert.equal(isUserId("not-a-user"), false);
});

test("keeps production billing redirects on the canonical origin", () => {
  assert.equal(
    getBillingReturnUrl("https://preview.example.com/api/billing/checkout", "/plans"),
    "https://www.getpricepeek.com/plans"
  );
});

test("allows the current localhost origin during development", () => {
  assert.equal(
    getBillingReturnUrl("http://localhost:3001/api/billing/checkout", "/plans"),
    "http://localhost:3001/plans"
  );
});
