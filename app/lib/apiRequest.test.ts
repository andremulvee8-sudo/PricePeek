import assert from "node:assert/strict";
import test from "node:test";
import { readJsonObject } from "./apiRequest.ts";

function jsonRequest(body: string, headers: HeadersInit = {}) {
  return new Request("https://pricepeek.test/api/example", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

test("reads a valid JSON object", async () => {
  const result = await readJsonObject(jsonRequest('{"url":"https://example.com"}'));

  assert.deepEqual(result, {
    ok: true,
    data: { url: "https://example.com" },
  });
});

test("rejects malformed JSON as a client error", async () => {
  const result = await readJsonObject(jsonRequest("{"));

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("requires an application/json content type", async () => {
  const request = new Request("https://pricepeek.test/api/example", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });
  const result = await readJsonObject(request);

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 415);
});

test("rejects request bodies above the configured byte limit", async () => {
  const result = await readJsonObject(jsonRequest('{"value":"large"}'), 8);

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});
