import { NextResponse } from "next/server";

function isValidAmazonProductUrl(value: string) {
  return /^https?:\/\/(www\.)?amazon\.[a-z.]+\/(?:dp|gp)\/([A-Za-z0-9]{3,})/i.test(value);
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

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "product",
    url,
  });

  try {
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

      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
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
          data.product.main_image?.link ?? data.product.images?.[0]?.link ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Rainforest API request failed." },
      { status: 502 }
    );
  }
}