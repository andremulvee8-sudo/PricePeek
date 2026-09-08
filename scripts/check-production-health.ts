import { parseHealthProbe, validateHealthUrl } from "../app/lib/healthProbe.ts";

const configuredUrl = process.env.PRICEPEEK_HEALTH_URL;

if (!configuredUrl) {
  console.error("Production health check failed: PRICEPEEK_HEALTH_URL is missing.");
  process.exitCode = 1;
} else {
  await checkHealth(configuredUrl);
}

async function checkHealth(configuredUrl: string) {
  try {
    const url = validateHealthUrl(configuredUrl);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PricePeek-production-health-check",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });

    const cacheControl = response.headers.get("cache-control") ?? "";
    if (!cacheControl.toLowerCase().includes("no-store")) {
      throw new Error("Health endpoint is missing its no-store cache policy.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error("Health endpoint did not return JSON.");
    }

    const result = parseHealthProbe(response.status, await response.json());
    if (!result.ok) {
      const detail = [result.message, result.state, result.reason]
        .filter(Boolean)
        .join(" ");
      throw new Error(detail);
    }

    console.log(
      `PricePeek production health: ${result.state} (${result.reason}).`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Health request could not complete.";
    console.error(`Production health check failed: ${message}`);
    process.exitCode = 1;
  }
}
