import { NextResponse } from "next/server";
import { getPriceCheckHealth } from "../../lib/priceCheckHealth";

export const dynamic = "force-dynamic";

export async function GET() {
  const priceChecks = await getPriceCheckHealth();
  const healthy = priceChecks.state === "healthy";

  return NextResponse.json(
    {
      status: healthy ? "ok" : priceChecks.state,
      priceChecks,
    },
    {
      status: healthy || priceChecks.state === "checking" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
