import assert from "node:assert/strict";
import test from "node:test";
import {
  createRateLimitIdentifier,
  getClientAddress,
  getRetryAfterSeconds,
} from "./rateLimit.ts";

test("prefers Vercel's protected forwarded address", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "192.0.2.4",
    "x-forwarded-for": "203.0.113.8, 10.0.0.1",
    "x-real-ip": "198.51.100.2",
  });

  assert.equal(getClientAddress(headers), "192.0.2.4");
});

test("uses the first standard forwarded address as a local fallback", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.8, 10.0.0.1",
    "x-real-ip": "198.51.100.2",
  });

  assert.equal(getClientAddress(headers), "203.0.113.8");
});

test("creates a stable identifier without retaining the client address", () => {
  const identifier = createRateLimitIdentifier(
    "product-search",
    "203.0.113.8",
    "a-test-secret-that-is-long-enough"
  );

  assert.equal(identifier, createRateLimitIdentifier(
    "product-search",
    "203.0.113.8",
    "a-test-secret-that-is-long-enough"
  ));
  assert.match(identifier, /^product-search:[a-f0-9]{64}$/);
  assert.doesNotMatch(identifier, /203\.0\.113\.8/);
});

test("different secrets produce different identifiers", () => {
  const first = createRateLimitIdentifier("product-search", "client", "secret-one");
  const second = createRateLimitIdentifier("product-search", "client", "secret-two");

  assert.notEqual(first, second);
});

test("calculates a positive Retry-After value", () => {
  assert.equal(
    getRetryAfterSeconds(
      "2026-09-04T10:00:30.100Z",
      new Date("2026-09-04T10:00:00.000Z")
    ),
    31
  );
  assert.equal(
    getRetryAfterSeconds(
      "2026-09-04T09:00:00.000Z",
      new Date("2026-09-04T10:00:00.000Z")
    ),
    1
  );
});
