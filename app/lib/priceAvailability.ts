export type PriceAvailability = {
  label: string;
  detail: string;
};

type PriceAvailabilityInput = {
  currentPrice: number | null;
  isTracked: boolean;
  consecutiveFailures?: number;
  nextCheckAt?: string | null;
};

function formatNextCheck(nextCheckAt: string | null | undefined) {
  if (!nextCheckAt) return null;

  const timestamp = new Date(nextCheckAt);
  if (!Number.isFinite(timestamp.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function getPriceAvailability({
  currentPrice,
  isTracked,
  consecutiveFailures = 0,
  nextCheckAt,
}: PriceAvailabilityInput): PriceAvailability | null {
  if (currentPrice != null && Number.isFinite(currentPrice)) return null;

  const nextCheck = formatNextCheck(nextCheckAt);

  if (!isTracked) {
    return {
      label: "Current price temporarily unavailable",
      detail:
        "Amazon did not expose a current price for this listing. You can still enter a target price and save it; PricePeek will retry during scheduled checks.",
    };
  }

  if (consecutiveFailures > 0) {
    return {
      label: "Price check needs another attempt",
      detail: nextCheck
        ? `The last lookup did not return a usable price. The next automatic attempt is scheduled for ${nextCheck}.`
        : "The last lookup did not return a usable price. PricePeek will retry automatically.",
    };
  }

  return {
    label: "Waiting for the first recorded price",
    detail: nextCheck
      ? `Tracking is active. The next automatic attempt is scheduled for ${nextCheck}.`
      : "Tracking is active and PricePeek will try again automatically.",
  };
}
