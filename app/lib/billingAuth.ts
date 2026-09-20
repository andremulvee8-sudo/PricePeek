import "server-only";

import { getBearerToken } from "./ownership";
import { supabaseAdmin } from "./supabaseAdmin";

export async function authenticateBillingRequest(request: Request) {
  const token = getBearerToken(request.headers.get("authorization"));

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}
