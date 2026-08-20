import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const MAX_REQUESTS = 5;
const WINDOW_LENGTH_MS = 60 * 60 * 1000;

function isValidAmazonProductUrl(value: string) {
  return /^https?:\/\/(www\.)?amazon\.[a-z.]+\/(?:dp|gp)\/([A-Za-z0-9]{3,})/i.test(
    value
  );
}

async function checkRateLimit(identifier: string) {
  const now = new Date();

  const { data, error } = await supabaseAdmin
    .from("api_rate_limits")
    .select("request_count, window_started_at")
    .eq("identifier", identifier)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const windowExpired =
    !data ||
    now.getTime() -
      new Date(data.window_started_at).getTime() >=
      WINDOW_LENGTH_MS;

  if (windowExpired) {
    const { error: resetError } = await supabaseAdmin
      .from("api_rate_limits")
      .upsert({
        identifier,
        request_count: 1,
        window_started_at: now.toISOString(),
      });

    if (resetError) {
      throw new Error(resetError.message);
    }

    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
    };
  }

  if (data.request_count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  const newRequestCount = data.request_count + 1;

  const { error: updateError } = await supabaseAdmin
    .from("api_rate_limits")
    .update({
      request_count: newRequestCount,
    })
    .eq("identifier", identifier);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - newRequestCount,
  };
}

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json(
      { error: "No URL provided." },
      { status: 400 }
    );
  }

  if (!isValidAmazonProductUrl(url)) {
    return NextResponse.json(
      { error: "Please provide a valid Amazon product URL." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RAINFOREST_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Rainforest API key is not configured." },
      { status: 500 }
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";

  try {
    const rateLimit = await checkRateLimit(
      `product-search:${ipAddress}`
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "You have reached the limit of 5 product searches per hour. Please try again later.",
        },
        { status: 429 }
      );
    }

    const params = new URLSearchParams({
      api_key: apiKey,
      type: "product",
      url,
    });

    const response = await fetch(
      `https://api.rainforestapi.com/request?${params.toString()}`
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.request_info?.message ||
        data?.error ||
        "Rainforest API request failed.";

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    if (data?.request_info?.success !== true || !data?.product) {
      const errorMessage =
        data?.request_info?.message ||
        data?.error ||
        "Rainforest API request failed or returned no product.";

      return NextResponse.json(
        { error: errorMessage },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        remainingSearches: rateLimit.remaining,
        product: {
          title: data.product.title,
          currentPrice:
            data.product.buybox_winner?.price?.value ??
            data.product.price?.value ??
            null,
          lowestPrice:
            data.product.buybox_winner?.price?.value ??
            data.product.price?.value ??
            null,
          rating: data.product.rating ?? null,
          image:
            data.product.main_image?.link ??
            data.product.images?.[0]?.link ??
            null,
        },
      },
      {
        headers: {
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
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