export type AmazonMarketplace = {
  marketplace: string;
  currency: string;
  locale: string;
};

export type ParsedAmazonProduct = AmazonMarketplace & {
  asin: string;
  canonicalUrl: string;
};

const MARKETPLACES: Record<string, Omit<AmazonMarketplace, "marketplace">> = {
  "amazon.ae": { currency: "AED", locale: "ar-AE" },
  "amazon.ca": { currency: "CAD", locale: "en-CA" },
  "amazon.co.jp": { currency: "JPY", locale: "ja-JP" },
  "amazon.co.uk": { currency: "GBP", locale: "en-GB" },
  "amazon.com": { currency: "USD", locale: "en-US" },
  "amazon.com.au": { currency: "AUD", locale: "en-AU" },
  "amazon.com.be": { currency: "EUR", locale: "nl-BE" },
  "amazon.com.br": { currency: "BRL", locale: "pt-BR" },
  "amazon.com.mx": { currency: "MXN", locale: "es-MX" },
  "amazon.com.tr": { currency: "TRY", locale: "tr-TR" },
  "amazon.de": { currency: "EUR", locale: "de-DE" },
  "amazon.eg": { currency: "EGP", locale: "ar-EG" },
  "amazon.es": { currency: "EUR", locale: "es-ES" },
  "amazon.fr": { currency: "EUR", locale: "fr-FR" },
  "amazon.in": { currency: "INR", locale: "en-IN" },
  "amazon.it": { currency: "EUR", locale: "it-IT" },
  "amazon.nl": { currency: "EUR", locale: "nl-NL" },
  "amazon.pl": { currency: "PLN", locale: "pl-PL" },
  "amazon.sa": { currency: "SAR", locale: "ar-SA" },
  "amazon.se": { currency: "SEK", locale: "sv-SE" },
  "amazon.sg": { currency: "SGD", locale: "en-SG" },
};

const SUPPORTED_SUBDOMAINS = new Set(["www", "smile", "m"]);

function normalizeMarketplace(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const firstDot = host.indexOf(".");

  if (firstDot > 0 && SUPPORTED_SUBDOMAINS.has(host.slice(0, firstDot))) {
    return host.slice(firstDot + 1);
  }

  return host;
}

export function parseAmazonProductUrl(value: string): ParsedAmazonProduct | null {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const marketplace = normalizeMarketplace(url.hostname);
  const marketplaceDetails = MARKETPLACES[marketplace];

  if (!marketplaceDetails) return null;

  const match = url.pathname.match(
    /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i
  );

  if (!match?.[1]) return null;

  const asin = match[1].toUpperCase();

  return {
    marketplace,
    asin,
    canonicalUrl: `https://www.${marketplace}/dp/${asin}`,
    ...marketplaceDetails,
  };
}

export function formatCurrency(
  value: number,
  currency: string,
  locale?: string
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
