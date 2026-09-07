import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemainingMagicLinkCooldownSeconds,
  MAGIC_LINK_COOLDOWN_MS,
} from "./authCooldown.ts";

test("enforces a short cooldown after sending a magic link", () => {
  const sentAt = 1_000;

  assert.equal(getRemainingMagicLinkCooldownSeconds(sentAt, sentAt), 60);
  assert.equal(
    getRemainingMagicLinkCooldownSeconds(sentAt, sentAt + 30_500),
    30
  );
  assert.equal(
    getRemainingMagicLinkCooldownSeconds(sentAt, sentAt + MAGIC_LINK_COOLDOWN_MS),
    0
  );
});

test("does not start a cooldown before a link is sent", () => {
  assert.equal(getRemainingMagicLinkCooldownSeconds(null), 0);
});
