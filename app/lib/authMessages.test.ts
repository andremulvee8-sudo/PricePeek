import assert from "node:assert/strict";
import test from "node:test";
import { getAuthErrorMessage } from "./authMessages.ts";

test("explains Supabase email rate limits without exposing internals", () => {
  assert.match(
    getAuthErrorMessage({ status: 429, code: "over_email_send_rate_limit" }),
    /Wait an hour/
  );
  assert.match(getAuthErrorMessage(new Error("Too many requests")), /Wait an hour/);
});

test("explains default-provider email restrictions", () => {
  assert.match(
    getAuthErrorMessage(new Error("Email address not authorized")),
    /production email delivery/
  );
});

test("uses a safe generic message for unknown authentication failures", () => {
  assert.equal(
    getAuthErrorMessage(new Error("internal provider detail")),
    "Could not send the sign-in link. Please try again."
  );
});
