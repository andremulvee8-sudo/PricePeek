import "server-only";

import { supabaseAdmin } from "./supabaseAdmin";
import { getBearerToken, type RequestOwner } from "./ownership";

export async function resolveRequestOwner(
  request: Request,
  deviceId: unknown
): Promise<RequestOwner | null> {
  const token = getBearerToken(request.headers.get("authorization"));

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && data.user) {
      return { kind: "user", userId: data.user.id };
    }

    return null;
  }

  if (typeof deviceId !== "string" || deviceId.trim().length === 0) {
    return null;
  }

  return { kind: "device", deviceId };
}
