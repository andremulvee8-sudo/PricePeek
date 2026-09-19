import {
  extractUrlFromText,
  isAmazonShortUrl,
  parseAmazonProductUrl,
  type ParsedAmazonProduct,
} from "./amazonProduct.ts";

const MAX_REDIRECTS = 5;
const REDIRECT_TIMEOUT_MS = 5_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export async function resolveAmazonProductUrl(
  value: string,
  fetcher: FetchLike = fetch
): Promise<ParsedAmazonProduct | null> {
  const directProduct = parseAmazonProductUrl(value);

  if (directProduct) return directProduct;

  const extractedUrl = extractUrlFromText(value);

  if (!extractedUrl || !isAmazonShortUrl(extractedUrl)) return null;

  let currentUrl = extractedUrl;

  for (let redirectCount = 0; redirectCount < MAX_REDIRECTS; redirectCount += 1) {
    let response: Response;

    try {
      response = await fetcher(currentUrl, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(REDIRECT_TIMEOUT_MS),
      });
    } catch {
      return null;
    }

    if (!REDIRECT_STATUSES.has(response.status)) return null;

    const location = response.headers.get("location");

    if (!location) return null;

    let nextUrl: URL;

    try {
      nextUrl = new URL(location, currentUrl);
    } catch {
      return null;
    }

    const parsedProduct = parseAmazonProductUrl(nextUrl.toString());

    if (parsedProduct) return parsedProduct;

    if (!isAmazonShortUrl(nextUrl.toString())) return null;

    currentUrl = nextUrl.toString();
  }

  return null;
}
