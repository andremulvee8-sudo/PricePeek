import { NextResponse } from "next/server";
import { parseAmazonProductUrl } from "../../lib/amazonProduct";
import { readJsonObject } from "../../lib/apiRequest";
import { calculateDealStatus } from "../../lib/productInsights";
import {
  createRateLimitIdentifier,
  getClientAddress,
  getRetryAfterSeconds,
} from "../../lib/rateLimit";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const MAX_REQUESTS = 5;
const WINDOW_LENGTH_SECONDS = 60 * 60;
const LOOKUP_TIMEOUT_MS = 25_000;

async function checkRateLimit(identifier: string) {
  const { data, error } = await supabaseAdmin
    .rpc("consume_api_rate_limit", {
      p_identifier: identifier,
      p_limit: MAX_REQUESTS,
      p_window_seconds: WINDOW_LENGTH_SECONDS,
    });

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (
    !result ||
    typeof result.allowed !== "boolean" ||
    typeof result.remaining !== "number" ||
    typeof result.reset_at !== "string"
  ) {
    throw new Error("Rate-limit function returned an invalid result");
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.reset_at,
  };
}

export async function POST(request: Request) {
  const body = await readJsonObject(request);

  if (!body.ok) {
    return NextResponse.json(
      { error: body.error },
      { status: body.status }
    );
  }

  const { url } = body.data;

  if (!url) {
    return NextResponse.json(
      { error: "No URL provided." },
      { status: 400 }
    );
  }

  const parsedProduct =
    typeof url === "string" ? parseAmazonProductUrl(url) : null;

  if (!parsedProduct) {
    return NextResponse.json(
      { error: "Please provide a valid Amazon product URL." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RAINFOREST_API_KEY;
  const rateLimitSecret = process.env.RATE_LIMIT_SECRET;

  if (!apiKey || !rateLimitSecret || rateLimitSecret.length < 32) {
    return NextResponse.json(
      { error: "Product lookup is temporarily unavailable." },
      { status: 500 }
    );
  }

  try {
    const identifier = createRateLimitIdentifier(
      "product-search",
      getClientAddress(request.headers),
      rateLimitSecret
    );
    const rateLimit = await checkRateLimit(
      identifier
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "You have reached the limit of 5 product searches per hour. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt,
          },
        }
      );
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      type: "product",
      url: parsedProduct.canonicalUrl,
    });

    const response = await fetch(
      `https://api.rainforestapi.com/request?${params.toString()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      }
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Product provider request failed:", {
        status: response.status,
      });

      return NextResponse.json(
        { error: "The product service is temporarily unavailable. Please try again." },
        { status: 502 }
      );
    }

    if (data?.request_info?.success !== true || !data?.product) {
      return NextResponse.json(
        { error: "No current product information was available for that link." },
        { status: 502 }
      );
    }

    const currentPrice =
      data.product.buybox_winner?.price?.value ??
      data.product.price?.value ??
      null;
    const dealStatus = calculateDealStatus(currentPrice, []);

    return NextResponse.json(
      {
        success: true,
        remainingSearches: rateLimit.remaining,
        product: {
          title: data.product.title,
          currentPrice,
          lowestPrice: dealStatus.historicalMinimum,
          rating: data.product.rating ?? null,
          image:
            data.product.main_image?.link ??
            data.product.images?.[0]?.link ??
            null,
          marketplace: parsedProduct.marketplace,
          asin: parsedProduct.asin,
          currency: parsedProduct.currency,
          dealStatus,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt,
        },
      }
    );
  } catch (error) {
    console.error("Product request failed:", error);

    return NextResponse.json(
      { error: "Product lookup is temporarily unavailable." },
      { status: 500 }
    );
  }
}
