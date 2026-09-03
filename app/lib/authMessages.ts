type AuthErrorShape = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

export function getAuthErrorMessage(error: unknown) {
  const details =
    typeof error === "object" && error !== null
      ? (error as AuthErrorShape)
      : null;
  const code = typeof details?.code === "string" ? details.code : "";
  const message =
    typeof details?.message === "string" ? details.message.toLowerCase() : "";

  if (
    details?.status === 429 ||
    code.includes("rate_limit") ||
    message.includes("too many requests")
  ) {
    return "Too many sign-in emails were requested. Wait an hour, then try once.";
  }

  if (message.includes("email address not authorized")) {
    return "This email cannot receive sign-in links until production email delivery is configured.";
  }

  return "Could not send the sign-in link. Please try again.";
}
