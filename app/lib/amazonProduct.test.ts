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

test("parses every supported marketplace and mobile product path", () => {
  const marketplaces = [
    ["amazon.ae", "AED", "ar-AE"],
    ["amazon.ca", "CAD", "en-CA"],
    ["amazon.co.jp", "JPY", "ja-JP"],
    ["amazon.co.uk", "GBP", "en-GB"],
    ["amazon.com", "USD", "en-US"],
    ["amazon.com.au", "AUD", "en-AU"],
    ["amazon.com.be", "EUR", "nl-BE"],
    ["amazon.com.br", "BRL", "pt-BR"],
    ["amazon.com.mx", "MXN", "es-MX"],
    ["amazon.com.tr", "TRY", "tr-TR"],
    ["amazon.de", "EUR", "de-DE"],
    ["amazon.eg", "EGP", "ar-EG"],
    ["amazon.es", "EUR", "es-ES"],
    ["amazon.fr", "EUR", "fr-FR"],
    ["amazon.in", "INR", "en-IN"],
    ["amazon.it", "EUR", "it-IT"],
    ["amazon.nl", "EUR", "nl-NL"],
    ["amazon.pl", "PLN", "pl-PL"],
    ["amazon.sa", "SAR", "ar-SA"],
    ["amazon.se", "SEK", "sv-SE"],
    ["amazon.sg", "SGD", "en-SG"],
  ] as const;
  const paths = [
    "/dp/B0ABC12345",
    "/gp/product/B0ABC12345",
    "/gp/aw/d/B0ABC12345",
  ];

  for (const [marketplace, currency, locale] of marketplaces) {
    for (const path of paths) {
      const result = parseAmazonProductUrl(
        `Shared from phone: https://m.${marketplace}${path}?ref_=share.`
      );

      assert.deepEqual(result, {
        marketplace,
        asin: "B0ABC12345",
        canonicalUrl: `https://www.${marketplace}/dp/B0ABC12345`,
        currency,
        locale,
      });
      assert.doesNotThrow(() => formatCurrency(1234.56, currency, locale));
    }
  }
});
