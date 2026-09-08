export type HealthProbeResult =
  | {
      ok: true;
      state: "healthy" | "checking";
      reason: string;
    }
  | {
      ok: false;
      state: string | null;
      reason: string | null;
      message: string;
    };

export function parseHealthProbe(
  statusCode: number,
  payload: unknown
): HealthProbeResult {
  if (!isRecord(payload) || !isRecord(payload.priceChecks)) {
    return failedProbe(null, null, "Health response has an unexpected shape.");
  }

  const status = stringValue(payload.status);
  const state = stringValue(payload.priceChecks.state);
  const reason = stringValue(payload.priceChecks.reason);

  if (!state || !reason) {
    return failedProbe(state, reason, "Health response is missing its state.");
  }

  if (statusCode < 200 || statusCode >= 300) {
    return failedProbe(
      state,
      reason,
      `Health endpoint returned HTTP ${statusCode}.`
    );
  }

  if (state !== "healthy" && state !== "checking") {
    return failedProbe(state, reason, `Price checks are ${state}.`);
  }

  const expectedStatus = state === "healthy" ? "ok" : "checking";
  if (status !== expectedStatus) {
    return failedProbe(
      state,
      reason,
      "Health response status does not match its check state."
    );
  }

  return { ok: true, state, reason };
}

export function validateHealthUrl(value: string) {
  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/api/health" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "PRICEPEEK_HEALTH_URL must be an HTTPS /api/health URL without credentials, query parameters, or a fragment."
    );
  }

  return url;
}

function failedProbe(
  state: string | null,
  reason: string | null,
  message: string
): HealthProbeResult {
  return { ok: false, state, reason, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
