import assert from "node:assert/strict";
import test from "node:test";
import {
  getBearerToken,
  getOwnerColumn,
  shouldMergeClaimedProduct,
} from "./ownership.ts";

test("extracts only non-empty bearer tokens", () => {
  assert.equal(getBearerToken("Bearer account-token"), "account-token");
  assert.equal(getBearerToken("Basic account-token"), null);
  assert.equal(getBearerToken("Bearer   "), null);
  assert.equal(getBearerToken(null), null);
});

test("maps account and anonymous owners to separate database columns", () => {
  assert.deepEqual(
    getOwnerColumn({ kind: "user", userId: "user-1" }),
    { column: "owner_user_id", value: "user-1" }
  );
  assert.deepEqual(
    getOwnerColumn({ kind: "device", deviceId: "device-1" }),
    { column: "device_id", value: "device-1" }
  );
});

test("merges claimed products only when the account already tracks them", () => {
  assert.equal(shouldMergeClaimedProduct("existing-product"), true);
  assert.equal(shouldMergeClaimedProduct(null), false);
});
