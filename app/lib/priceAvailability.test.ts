import assert from "node:assert/strict";
import test from "node:test";
import { getPriceAvailability } from "./priceAvailability.ts";

test("returns no warning when a current price exists", () => {
  assert.equal(
    getPriceAvailability({ currentPrice: 12.5, isTracked: false }),
    null
  );
});

test("explains that a product without a price can still be saved", () => {
  assert.deepEqual(
    getPriceAvailability({ currentPrice: null, isTracked: false }),
    {
      label: "Current price temporarily unavailable",
      detail:
        "Amazon did not expose a current price for this listing. You can still enter a target price and save it; PricePeek will retry during scheduled checks.",
    }
  );
});

test("explains scheduled retry state without exposing provider errors", () => {
  const availability = getPriceAvailability({
    currentPrice: null,
    isTracked: true,
    consecutiveFailures: 2,
    nextCheckAt: "2026-09-08T10:00:00.000Z",
  });

  assert.equal(availability?.label, "Price check needs another attempt");
  assert.match(availability?.detail ?? "", /next automatic attempt/i);
  assert.doesNotMatch(availability?.detail ?? "", /provider|rainforest|error/i);
});
