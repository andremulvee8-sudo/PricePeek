export const PRICE_CHECK_BATCH_SIZE = 25;
export const PRICE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const MAX_FAILURE_BACKOFF_MS = 24 * 60 * 60 * 1000;

export type PriceCheckCandidate = {
  isActive: boolean;
  nextCheckAt: string | null;
  notificationSent: boolean;
};

export function isDueForPriceCheck(
  product: PriceCheckCandidate,
  now: Date
) {
  if (!product.isActive) return false;
  if (!product.nextCheckAt) return true;

  return new Date(product.nextCheckAt).getTime() <= now.getTime();
}

export function selectPriceCheckCandidates<T extends PriceCheckCandidate>(
  products: T[],
  now: Date,
  limit = PRICE_CHECK_BATCH_SIZE
) {
  return products
    .filter((product) => isDueForPriceCheck(product, now))
    .sort((left, right) => {
      const leftTime = left.nextCheckAt
        ? new Date(left.nextCheckAt).getTime()
        : Number.NEGATIVE_INFINITY;
      const rightTime = right.nextCheckAt
        ? new Date(right.nextCheckAt).getTime()
        : Number.NEGATIVE_INFINITY;

      return leftTime - rightTime;
    })
    .slice(0, limit);
}

export function getNextSuccessfulCheckAt(now: Date) {
  return new Date(now.getTime() + PRICE_CHECK_INTERVAL_MS).toISOString();
}

export function getNextFailedCheckAt(now: Date, consecutiveFailures: number) {
  const safeFailureCount = Math.max(1, consecutiveFailures);
  const backoffMs = Math.min(
    60 * 60 * 1000 * 2 ** (safeFailureCount - 1),
    MAX_FAILURE_BACKOFF_MS
  );

  return new Date(now.getTime() + backoffMs).toISOString();
}

export function shouldSendPriceAlert(
  currentPrice: number,
  targetPrice: number,
  notificationSent: boolean
) {
  return currentPrice <= targetPrice && !notificationSent;
}
