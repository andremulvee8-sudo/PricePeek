import "server-only";

import { evaluateCronHealth, type CronRunStatus } from "./cronHealth";
import { supabaseAdmin } from "./supabaseAdmin";

type LatestRun = {
  status: CronRunStatus;
  started_at: string;
  completed_at: string | null;
};

export async function getPriceCheckHealth() {
  const { data, error } = await supabaseAdmin
    .from("price_check_runs")
    .select("status, started_at, completed_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestRun>();

  if (error) {
    console.error("Could not read price-check health:", {
      code: error.code,
    });
    return {
      state: "degraded" as const,
      reason: "health-unavailable" as const,
      lastCompletedAt: null,
    };
  }

  const health = evaluateCronHealth(data);

  return {
    ...health,
    lastCompletedAt: data?.completed_at ?? null,
  };
}
