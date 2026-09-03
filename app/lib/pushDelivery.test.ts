import assert from "node:assert/strict";
import test from "node:test";
import { isExpiredPushSubscriptionError } from "./pushDelivery.ts";

test("recognizes expired and missing Web Push subscriptions", () => {
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 404 }), true);
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 410 }), true);
});

test("does not discard subscriptions for transient delivery errors", () => {
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 429 }), false);
  assert.equal(isExpiredPushSubscriptionError({ statusCode: 500 }), false);
  assert.equal(isExpiredPushSubscriptionError(new Error("network")), false);
});
