export const MAX_JSON_BODY_BYTES = 16 * 1024;

export type JsonObject = Record<string, unknown>;

export type JsonObjectResult =
  | { ok: true; data: JsonObject }
  | { ok: false; status: 400 | 413 | 415; error: string };

function isJsonContentType(contentType: string | null) {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

export async function readJsonObject(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<JsonObjectResult> {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return {
      ok: false,
      status: 415,
      error: "Content-Type must be application/json.",
    };
  }

  const declaredLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: "Request body is too large.",
    };
  }

  const body = await request.text();

  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: "Request body is too large.",
    };
  }

  let data: unknown;

  try {
    data = JSON.parse(body);
  } catch {
    return { ok: false, status: 400, error: "Request body must be valid JSON." };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }

  return { ok: true, data: data as JsonObject };
}
