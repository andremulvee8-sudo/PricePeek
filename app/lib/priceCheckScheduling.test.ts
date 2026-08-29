import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextFailedCheckAt,
  selectPriceCheckCandidates,
  shouldSendPriceAlert,
} from "./priceCheckScheduling.ts";

const now = new Date("2026-08-29T09:00:00.000Z");

test("active notified products remain eligible for scheduled checking", () => {
  const notifiedProduct = {
    id: "notified",
    isActive: true,
    nextCheckAt: "2026-08-29T08:00:00.000Z",
    notificationSent: true,
  };

  assert.deepEqual(selectPriceCheckCandidates([notifiedProduct], now), [
    notifiedProduct,
  ]);
});

test("inactive and future-scheduled products are excluded", () => {
  const dueProduct = {
    id: "due",
    isActive: true,
    nextCheckAt: null,
    notificationSent: false,
  };
  const products = [
    {
      id: "inactive",
      isActive: false,
      nextCheckAt: "2026-08-28T09:00:00.000Z",
      notificationSent: false,
    },
    {
      id: "future",
      isActive: true,
      nextCheckAt: "2026-08-30T09:00:00.000Z",
      notificationSent: false,
    },
    dueProduct,
  ];

  assert.deepEqual(selectPriceCheckCandidates(products, now), [dueProduct]);
});

test("oldest due products are selected first and the batch limit is honored", () => {
  const products = [
    {
      id: "newer",
      isActive: true,
      nextCheckAt: "2026-08-29T08:00:00.000Z",
      notificationSent: false,
    },
    {
      id: "never-scheduled",
      isActive: true,
      nextCheckAt: null,
      notificationSent: false,
    },
    {
      id: "older",
      isActive: true,
      nextCheckAt: "2026-08-29T07:00:00.000Z",
      notificationSent: false,
    },
  ];

  assert.deepEqual(
    selectPriceCheckCandidates(products, now, 2).map(({ id }) => id),
    ["never-scheduled", "older"]
  );
});

test("failed checks receive increasing backoff capped at 24 hours", () => {
  assert.equal(
    getNextFailedCheckAt(now, 1),
    "2026-08-29T10:00:00.000Z"
  );
  assert.equal(
    getNextFailedCheckAt(now, 3),
    "2026-08-29T13:00:00.000Z"
  );
  assert.equal(
    getNextFailedCheckAt(now, 20),
    "2026-08-30T09:00:00.000Z"
  );
});

test("an alert is sent once per below-target episode", () => {
  assert.equal(shouldSendPriceAlert(80, 90, false), true);
  assert.equal(shouldSendPriceAlert(80, 90, true), false);
  assert.equal(shouldSendPriceAlert(100, 90, false), false);
});
