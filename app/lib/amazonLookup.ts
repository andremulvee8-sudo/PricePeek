export type AmazonLookupProduct = {
  title: string;
  currentPrice: number | null;
  rating: number | null;
  image: string | null;
};

export type AmazonLookupResult =
  | {
      ok: true;
      priceStatus: "available" | "unavailable";
      product: AmazonLookupProduct;
    }
  | {
      ok: false;
      kind: "product-unavailable" | "provider-unavailable";
      message: string;
      status: 404 | 502;
    };

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function readPrice(product: JsonRecord) {
  const buyboxWinner = asRecord(product.buybox_winner);
  const buyboxPrice = asRecord(buyboxWinner?.price);
  const productPrice = asRecord(product.price);

  return (
    finiteNumber(buyboxPrice?.value) ?? finiteNumber(productPrice?.value)
  );
}

function readImage(product: JsonRecord) {
  const mainImage = asRecord(product.main_image);
  const directImage = nonEmptyString(mainImage?.link);

  if (directImage) return directImage;

  if (!Array.isArray(product.images)) return null;

  for (const candidate of product.images) {
    const image = asRecord(candidate);
    const link = nonEmptyString(image?.link);

    if (link) return link;
  }

  return null;
}

export function interpretAmazonLookupResponse(
  responseOk: boolean,
  data: unknown
): AmazonLookupResult {
  if (!responseOk) {
    return {
      ok: false,
      kind: "provider-unavailable",
      message: "The product service is temporarily unavailable. Please try again.",
      status: 502,
    };
  }

  const payload = asRecord(data);
  const requestInfo = asRecord(payload?.request_info);

  if (requestInfo?.success !== true) {
    return {
      ok: false,
      kind: "provider-unavailable",
      message: "The product service is temporarily unavailable. Please try again.",
      status: 502,
    };
  }

  const product = asRecord(payload?.product);
  const title = nonEmptyString(product?.title);

  if (!product || !title) {
    return {
      ok: false,
      kind: "product-unavailable",
      message:
        "This Amazon listing is unavailable or no longer has product details.",
      status: 404,
    };
  }

  const currentPrice = readPrice(product);

  return {
    ok: true,
    priceStatus: currentPrice == null ? "unavailable" : "available",
    product: {
      title,
      currentPrice,
      rating: finiteNumber(product.rating),
      image: readImage(product),
    },
  };
}
