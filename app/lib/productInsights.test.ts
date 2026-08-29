import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDealStatus,
  getHistoricalMinimum,
  hasDuplicateTrackingIdentity,
} from "./productInsights.ts";

test("calculates the genuine minimum from recorded prices", () => {
  assert.equal(getHistoricalMinimum([120, 99.5, 110]), 99.5);
  assert.equal(getHistoricalMinimum([]), null);
});

test("reports insufficient history instead of claiming a deal", () => {
  assert.deepEqual(calculateDealStatus(90, [90]), {
    kind: "insufficient-history",
    label: "Not enough price history to assess this deal yet.",
    historicalMinimum: 90,
  });
});

test("reports historical lows and exact distance above the low", () => {
  assert.equal(calculateDealStatus(80, [100, 80]).kind, "historical-low");
  assert.deepEqual(calculateDealStatus(120, [100, 110]), {
    kind: "above-low",
    label: "20% above the lowest recorded price.",
    historicalMinimum: 100,
  });
});

test("deduplicates by owner, marketplace, and ASIN rather than URL", () => {
  const identities = [
    {
      ownerId: "device-1",
      marketplace: "amazon.es",
      asin: "B0ABC12345",
    },
  ];

  assert.equal(
    hasDuplicateTrackingIdentity(identities, {
      ownerId: "device-1",
      marketplace: "AMAZON.ES",
      asin: "b0abc12345",
    }),
    true
  );
  assert.equal(
    hasDuplicateTrackingIdentity(identities, {
      ownerId: "device-2",
      marketplace: "amazon.es",
      asin: "B0ABC12345",
    }),
    false
  );
});
