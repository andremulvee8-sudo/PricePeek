import assert from "node:assert/strict";
import test from "node:test";
import { resolveAmazonProductUrl } from "./amazonUrlResolver.ts";

test("returns direct product links without making a network request", async () => {
  let requests = 0;
  const result = await resolveAmazonProductUrl(
    "https://www.amazon.es/dp/B0ABC12345",
    async () => {
      requests += 1;
      throw new Error("Unexpected request");
    }
  );

  assert.equal(requests, 0);
  assert.equal(result?.asin, "B0ABC12345");
});

test("resolves an Amazon short link to a supported product URL", async () => {
  const result = await resolveAmazonProductUrl(
    "Check this out https://amzn.eu/d/example",
    async () =>
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://www.amazon.es/example-product/dp/B0ABC12345?ref_=share",
        },
      })
  );

  assert.equal(result?.canonicalUrl, "https://www.amazon.es/dp/B0ABC12345");
});

test("accepts each supported Amazon short-link host", async () => {
  for (const host of ["a.co", "amzn.eu", "amzn.to", "amzn.asia"]) {
    const result = await resolveAmazonProductUrl(
      `Shared from Amazon https://${host}/d/example`,
      async () =>
        new Response(null, {
          status: 301,
          headers: {
            location: "https://www.amazon.com/dp/B0ABC12345",
          },
        })
    );

    assert.equal(result?.asin, "B0ABC12345");
  }
});

test("never follows a short-link redirect to a non-Amazon host", async () => {
  let requests = 0;
  const result = await resolveAmazonProductUrl(
    "https://amzn.eu/d/example",
    async () => {
      requests += 1;
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private" },
      });
    }
  );

  assert.equal(requests, 1);
  assert.equal(result, null);
});

test("rejects arbitrary redirect services without requesting them", async () => {
  let requests = 0;
  const result = await resolveAmazonProductUrl(
    "https://example.com/redirect?to=https://amazon.es/dp/B0ABC12345",
    async () => {
      requests += 1;
      throw new Error("Unexpected request");
    }
  );

  assert.equal(requests, 0);
  assert.equal(result, null);
});
