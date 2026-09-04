import { createHmac } from "node:crypto";

export function getClientAddress(headers: Headers) {
  const forwardedAddress = (
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-forwarded-for")
  )
    ?.split(",", 1)[0]
    ?.trim();

  return forwardedAddress || headers.get("x-real-ip")?.trim() || "unknown";
}

export function createRateLimitIdentifier(
  namespace: string,
  clientAddress: string,
  secret: string
) {
  const digest = createHmac("sha256", secret)
    .update(clientAddress)
    .digest("hex");

  return `${namespace}:${digest}`;
}

export function getRetryAfterSeconds(resetAt: string, now = new Date()) {
  const resetTime = new Date(resetAt).getTime();

  if (!Number.isFinite(resetTime)) return 1;

  return Math.max(1, Math.ceil((resetTime - now.getTime()) / 1000));
}
