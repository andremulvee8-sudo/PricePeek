import assert from "node:assert/strict";
import test from "node:test";
import { interpretAmazonLookupResponse } from "./amazonLookup.ts";
import { resolveAmazonProductUrl } from "./amazonUrlResolver.ts";

test("normalizes an available product and prefers its buy-box price", () => {
  assert.deepEqual(
    interpretAmazonLookupResponse(true, {
      request_info: { success: true },
      product: {
        title: "Example product",
        buybox_winner: { price: { value: 19.99 } },
        price: { value: 21.5 },
        rating: 4.4,
        main_image: { link: "https://images.example/product.jpg" },
      },
    }),
    {
      ok: true,
      priceStatus: "available",
      product: {
        title: "Example product",
        currentPrice: 19.99,
        rating: 4.4,
        image: "https://images.example/product.jpg",
      },
    }
  );
});

test("keeps a valid listing when its current price is unavailable", () => {
  const result = interpretAmazonLookupResponse(true, {
    request_info: { success: true },
    product: { title: "Temporarily out of stock" },
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.priceStatus, "unavailable");
  assert.equal(result.ok && result.product.currentPrice, null);
});

test("distinguishes an unavailable listing from a provider failure", () => {
  const unavailable = interpretAmazonLookupResponse(true, {
    request_info: { success: true },
  });
  const providerFailure = interpretAmazonLookupResponse(false, null);

  assert.deepEqual(unavailable, {
    ok: false,
    kind: "product-unavailable",
    message: "This Amazon listing is unavailable or no longer has product details.",
    status: 404,
  });
  assert.equal(providerFailure.ok, false);
  assert.equal(
    !providerFailure.ok && providerFailure.kind,
    "provider-unavailable"
  );
});

test("handles a copied phone share link through lookup normalization", async () => {
  const parsedProduct = await resolveAmazonProductUrl(
    "Found this on my phone https://amzn.eu/d/example",
    async () =>
      new Response(null, {
        status: 302,
        headers: {
          location:
            "https://m.amazon.es/example/gp/aw/d/B0ABC12345?ref_=share",
        },
      })
  );
  const lookup = interpretAmazonLookupResponse(true, {
    request_info: { success: true },
    product: {
      title: "Producto de prueba",
      price: { value: 49.95 },
    },
  });

  assert.equal(parsedProduct?.canonicalUrl, "https://www.amazon.es/dp/B0ABC12345");
  assert.equal(parsedProduct?.currency, "EUR");
  assert.equal(lookup.ok && lookup.product.currentPrice, 49.95);
});
