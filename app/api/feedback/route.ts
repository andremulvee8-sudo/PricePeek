import { NextResponse } from "next/server";
import { readJsonObject } from "../../lib/apiRequest";
import { validateFeedback } from "../../lib/feedback";
import {
  createRateLimitIdentifier,
  getClientAddress,
  getRetryAfterSeconds,
} from "../../lib/rateLimit";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

const MAX_REQUESTS = 3;
const WINDOW_LENGTH_SECONDS = 60 * 60;
const MAX_BODY_BYTES = 4 * 1024;

async function checkRateLimit(identifier: string) {
  const { data, error } = await supabaseAdmin.rpc("consume_api_rate_limit", {
    p_identifier: identifier,
    p_limit: MAX_REQUESTS,
    p_window_seconds: WINDOW_LENGTH_SECONDS,
  });

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? data[0] : data;

  if (
    !result ||
    typeof result.allowed !== "boolean" ||
    typeof result.remaining !== "number" ||
    typeof result.reset_at !== "string"
  ) {
    throw new Error("Rate-limit function returned an invalid result");
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.reset_at,
  };
}

export async function POST(request: Request) {
  const body = await readJsonObject(request, MAX_BODY_BYTES);

  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (typeof body.data.website === "string" && body.data.website.trim()) {
    return NextResponse.json({ success: true });
  }

  const validation = validateFeedback(body.data);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const rateLimitSecret = process.env.RATE_LIMIT_SECRET;

  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable." },
      { status: 503 }
    );
  }

  try {
    const identifier = createRateLimitIdentifier(
      "beta-feedback",
      getClientAddress(request.headers),
      rateLimitSecret
    );
    const rateLimit = await checkRateLimit(identifier);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Feedback limit reached. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(getRetryAfterSeconds(rateLimit.resetAt)),
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt,
          },
        }
      );
    }

    const { error } = await supabaseAdmin.from("beta_feedback").insert({
      category: validation.feedback.category,
      area: validation.feedback.area,
      message: validation.feedback.message,
    });

    if (error) {
      console.error("Could not store beta feedback:", { code: error.code });
      return NextResponse.json(
        { error: "Feedback could not be sent. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: true },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": rateLimit.resetAt,
        },
      }
    );
  } catch (error) {
    console.error("Feedback request failed:", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable." },
      { status: 503 }
    );
  }
}
