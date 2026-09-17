import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCurrency,
  extractUrlFromText,
  isAmazonShortUrl,
  parseAmazonProductUrl,
} from "./amazonProduct.ts";

test("parses dp and gp/product links into the same canonical identity", () => {
  const dp = parseAmazonProductUrl(
    "https://www.amazon.es/dp/B0ABC12345?tag=affiliate"
  );
  const gp = parseAmazonProductUrl(
    "https://smile.amazon.es/gp/product/b0abc12345/ref=something"
  );

  assert.deepEqual(dp, gp);
  assert.deepEqual(dp, {
    marketplace: "amazon.es",
    asin: "B0ABC12345",
    canonicalUrl: "https://www.amazon.es/dp/B0ABC12345",
    currency: "EUR",
    locale: "es-ES",
  });
});

test("parses mobile Amazon links and links copied with share text", () => {
  const mobile = parseAmazonProductUrl(
    "https://www.amazon.es/gp/aw/d/B0ABC12345/ref=mobile"
  );
  const shared = parseAmazonProductUrl(
    "Mira este producto: https://www.amazon.es/example/dp/B0ABC12345?ref_=share."
  );

  assert.equal(mobile?.canonicalUrl, "https://www.amazon.es/dp/B0ABC12345");
  assert.deepEqual(mobile, shared);
  assert.equal(
    extractUrlFromText("Amazon: https://amzn.eu/d/example),"),
    "https://amzn.eu/d/example"
  );
});

test("recognizes only HTTPS Amazon-owned short-link hosts", () => {
  assert.equal(isAmazonShortUrl("https://amzn.eu/d/example"), true);
  assert.equal(isAmazonShortUrl("Shared: https://a.co/d/example"), true);
  assert.equal(isAmazonShortUrl("http://amzn.eu/d/example"), false);
  assert.equal(isAmazonShortUrl("https://amzn.eu.example.com/d/example"), false);
});

test("rejects unsupported paths, invalid ASINs, and deceptive hosts", () => {
  assert.equal(parseAmazonProductUrl("https://amazon.com/search?q=test"), null);
  assert.equal(parseAmazonProductUrl("https://amazon.com/dp/SHORT"), null);
  assert.equal(
    parseAmazonProductUrl("https://amazon.com.example.com/dp/B0ABC12345"),
    null
  );
});

test("maps marketplace currencies and formats them with Intl", () => {
  assert.equal(
    parseAmazonProductUrl("https://amazon.co.uk/dp/B0ABC12345")?.currency,
    "GBP"
  );
  assert.equal(
    parseAmazonProductUrl("https://amazon.co.jp/dp/B0ABC12345")?.currency,
    "JPY"
  );
  assert.equal(formatCurrency(1234.5, "EUR", "de-DE"), "1.234,50 €");
  assert.equal(formatCurrency(1234.5, "USD", "en-US"), "$1,234.50");
});
