export type DealStatus = {
  kind: "insufficient-history" | "historical-low" | "above-low";
  label: string;
  historicalMinimum: number | null;
};

export function getHistoricalMinimum(prices: number[]) {
  const validPrices = prices.filter(
    (price) => Number.isFinite(price) && price >= 0
  );

  return validPrices.length > 0 ? Math.min(...validPrices) : null;
}

export function calculateDealStatus(
  currentPrice: number | null,
  historicalPrices: number[]
): DealStatus {
  const validHistoricalPrices = historicalPrices.filter(
    (price) => Number.isFinite(price) && price >= 0
  );
  const historicalMinimum = getHistoricalMinimum(validHistoricalPrices);

  if (
    currentPrice == null ||
    !Number.isFinite(currentPrice) ||
    validHistoricalPrices.length < 2 ||
    historicalMinimum == null
  ) {
    return {
      kind: "insufficient-history",
      label: "Not enough price history to assess this deal yet.",
      historicalMinimum,
    };
  }

  if (currentPrice <= historicalMinimum) {
    return {
      kind: "historical-low",
      label: "At the lowest recorded price.",
      historicalMinimum,
    };
  }

  const percentageAbove = Math.round(
    ((currentPrice - historicalMinimum) / historicalMinimum) * 100
  );

  return {
    kind: "above-low",
    label: `${percentageAbove}% above the lowest recorded price.`,
    historicalMinimum,
  };
}

export function trackingIdentityKey(
  ownerId: string,
  marketplace: string,
  asin: string
) {
  return [
    ownerId.trim(),
    marketplace.trim().toLowerCase(),
    asin.trim().toUpperCase(),
  ].join(":");
}

export function hasDuplicateTrackingIdentity(
  identities: Array<{
    ownerId: string;
    marketplace: string;
    asin: string;
  }>,
  candidate: { ownerId: string; marketplace: string; asin: string }
) {
  const candidateKey = trackingIdentityKey(
    candidate.ownerId,
    candidate.marketplace,
    candidate.asin
  );

  return identities.some(
    (identity) =>
      trackingIdentityKey(
        identity.ownerId,
        identity.marketplace,
        identity.asin
      ) === candidateKey
  );
}
