import assert from "node:assert/strict";
import test from "node:test";
import {
  containsSensitiveFeedbackContent,
  validateFeedback,
} from "./feedback.ts";

test("accepts and normalizes privacy-safe feedback", () => {
  assert.deepEqual(
    validateFeedback({
      category: "bug",
      area: "tracking",
      message: "  The save button stayed disabled after I entered a target.\r\n  ",
    }),
    {
      ok: true,
      feedback: {
        category: "bug",
        area: "tracking",
        message: "The save button stayed disabled after I entered a target.",
      },
    }
  );
});

test("rejects invalid categories, areas, and message lengths", () => {
  assert.equal(
    validateFeedback({ category: "complaint", area: "tracking", message: "A".repeat(30) }).ok,
    false
  );
  assert.equal(
    validateFeedback({ category: "idea", area: "checkout", message: "A".repeat(30) }).ok,
    false
  );
  assert.equal(
    validateFeedback({ category: "idea", area: "other", message: "Too short" }).ok,
    false
  );
  assert.equal(
    validateFeedback({ category: "idea", area: "other", message: "A".repeat(1_201) }).ok,
    false
  );
});

test("blocks contact details, links, credentials, and payment cards", () => {
  const unsafeValues = [
    "Please reply to beta@example.com about this broken button.",
    "The problem happened at https://example.com/private/path today.",
    `My Stripe value is ${"sk"}_live_not-a-real-secret-value so please test it.`,
    `Here is a fake webhook secret ${"whsec"}_not-a-real-secret-value for testing.`,
    "The test card number was 4242 4242 4242 4242 during checkout.",
    "Token eyJabcdefghijk.abcdefghijklmnop.abcdefghijklmnop failed today.",
  ];

  for (const value of unsafeValues) {
    assert.equal(containsSensitiveFeedbackContent(value), true, value);
    assert.equal(
      validateFeedback({ category: "bug", area: "billing", message: value }).ok,
      false,
      value
    );
  }
});

test("does not mistake ordinary numbers for payment-card data", () => {
  assert.equal(
    containsSensitiveFeedbackContent(
      "The price changed from 199.99 to 149.99 after the daily check."
    ),
    false
  );
});
