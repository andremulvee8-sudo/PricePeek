import assert from "node:assert/strict";
import test from "node:test";
import {
  isTransientSupabaseJwtTimingError,
  withTransientSupabaseReadRetry,
} from "./supabaseReadRetry.ts";

const TIMING_ERROR = {
  code: "PGRST303",
  message: "JWT issued at future",
};

test("recognizes only the transient Supabase JWT timing error", () => {
  assert.equal(isTransientSupabaseJwtTimingError(TIMING_ERROR), true);
  assert.equal(
    isTransientSupabaseJwtTimingError({
      code: "PGRST303",
      message: "JWT expired",
    }),
    false
  );
  assert.equal(
    isTransientSupabaseJwtTimingError({
      code: "42501",
      message: "JWT issued at future",
    }),
    false
  );
});

test("retries safe reads with bounded backoff after a JWT timing error", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await withTransientSupabaseReadRetry(
    async () => {
      attempts += 1;
      return attempts < 3
        ? { data: null, error: TIMING_ERROR }
        : { data: "ready", error: null };
    },
    {
      delaysMs: [10, 20],
      sleep: async (delayMs) => {
        delays.push(delayMs);
      },
    }
  );

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.deepEqual(result, { data: "ready", error: null });
});

test("does not retry unrelated Supabase errors", async () => {
  let attempts = 0;

  const result = await withTransientSupabaseReadRetry(
    async () => {
      attempts += 1;
      return {
        data: null,
        error: { code: "42501", message: "permission denied" },
      };
    },
    { delaysMs: [0, 0], sleep: async () => undefined }
  );

  assert.equal(attempts, 1);
  assert.equal(result.error?.code, "42501");
});

test("stops retrying after the configured retry budget", async () => {
  let attempts = 0;

  const result = await withTransientSupabaseReadRetry(
    async () => {
      attempts += 1;
      return { data: null, error: TIMING_ERROR };
    },
    { delaysMs: [0, 0], sleep: async () => undefined }
  );

  assert.equal(attempts, 3);
  assert.equal(result.error, TIMING_ERROR);
});
