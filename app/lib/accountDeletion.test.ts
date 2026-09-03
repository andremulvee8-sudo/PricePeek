import assert from "node:assert/strict";
import test from "node:test";
import { isAccountDeletionConfirmed } from "./accountDeletion.ts";

test("requires the signed-in email before deleting an account", () => {
  assert.equal(
    isAccountDeletionConfirmed("owner@example.com", "owner@example.com"),
    true
  );
  assert.equal(
    isAccountDeletionConfirmed("Owner@Example.com", " owner@example.com "),
    true
  );
});

test("rejects missing or different account deletion confirmations", () => {
  assert.equal(isAccountDeletionConfirmed("owner@example.com", "DELETE"), false);
  assert.equal(isAccountDeletionConfirmed("owner@example.com", null), false);
  assert.equal(isAccountDeletionConfirmed(null, "owner@example.com"), false);
});
