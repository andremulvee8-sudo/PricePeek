import assert from "node:assert/strict";
import test from "node:test";
import { parseHealthProbe, validateHealthUrl } from "./healthProbe.ts";

test("accepts a healthy aggregate response", () => {
  assert.deepEqual(
    parseHealthProbe(200, {
      status: "ok",
      priceChecks: { state: "healthy", reason: "last-run-succeeded" },
    }),
    { ok: true, state: "healthy", reason: "last-run-succeeded" }
  );
});

test("accepts a check that is currently running", () => {
  assert.deepEqual(
    parseHealthProbe(200, {
      status: "checking",
      priceChecks: { state: "checking", reason: "run-in-progress" },
    }),
    { ok: true, state: "checking", reason: "run-in-progress" }
  );
});

test("fails a degraded response without copying unrelated response fields", () => {
  const result = parseHealthProbe(503, {
    status: "degraded",
    priceChecks: {
      state: "degraded",
      reason: "last-run-failed",
      unexpectedPrivateValue: "must-not-be-returned",
    },
  });

  assert.deepEqual(result, {
    ok: false,
    state: "degraded",
    reason: "last-run-failed",
    message: "Health endpoint returned HTTP 503.",
  });
  assert.doesNotMatch(JSON.stringify(result), /must-not-be-returned/);
});

test("fails malformed and contradictory responses", () => {
  assert.equal(parseHealthProbe(200, null).ok, false);
  assert.equal(
    parseHealthProbe(200, {
      status: "ok",
      priceChecks: { state: "checking", reason: "run-in-progress" },
    }).ok,
    false
  );
});

test("allows only a credential-free HTTPS health URL", () => {
  assert.equal(
    validateHealthUrl("https://pricepeek.example/api/health").href,
    "https://pricepeek.example/api/health"
  );

  for (const value of [
    "http://pricepeek.example/api/health",
    "https://user:secret@pricepeek.example/api/health",
    "https://pricepeek.example/api/product",
    "https://pricepeek.example/api/health?token=secret",
    "https://pricepeek.example/api/health#secret",
  ]) {
    assert.throws(() => validateHealthUrl(value));
  }
});
