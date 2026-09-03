type PushErrorShape = {
  statusCode?: unknown;
};

export function isExpiredPushSubscriptionError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;

  const statusCode = (error as PushErrorShape).statusCode;
  return statusCode === 404 || statusCode === 410;
}
