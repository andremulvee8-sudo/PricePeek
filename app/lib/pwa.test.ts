import assert from "node:assert/strict";
import test from "node:test";
import {
  getInstallExperience,
  isAppleMobileDevice,
  isSafeShellRequest,
  isStandaloneDisplay,
} from "./pwa.ts";

test("detects iPhone, iPad, and touch-based iPadOS devices", () => {
  assert.equal(isAppleMobileDevice("Mozilla/5.0 (iPhone)"), true);
  assert.equal(isAppleMobileDevice("Mozilla/5.0 (iPad)"), true);
  assert.equal(isAppleMobileDevice("Mozilla/5.0", "MacIntel", 5), true);
  assert.equal(isAppleMobileDevice("Mozilla/5.0 (Android)"), false);
});

test("detects standalone mode from either browser API", () => {
  assert.equal(isStandaloneDisplay(true, false), true);
  assert.equal(isStandaloneDisplay(false, true), true);
  assert.equal(isStandaloneDisplay(false, false), false);
});

test("hides install UI when installed and routes other platforms correctly", () => {
  assert.equal(
    getInstallExperience({
      standalone: true,
      isAppleMobile: true,
      canPrompt: true,
    }),
    "hidden"
  );
  assert.equal(
    getInstallExperience({
      standalone: false,
      isAppleMobile: false,
      canPrompt: true,
    }),
    "browser-prompt"
  );
  assert.equal(
    getInstallExperience({
      standalone: false,
      isAppleMobile: true,
      canPrompt: false,
    }),
    "ios-help"
  );
});

test("cache allowlist excludes APIs and tracked-product requests", () => {
  assert.equal(isSafeShellRequest("/"), true);
  assert.equal(isSafeShellRequest("/_next/static/chunks/app.js"), true);
  assert.equal(isSafeShellRequest("/icon-192x192.png"), true);
  assert.equal(isSafeShellRequest("/api/product"), false);
  assert.equal(isSafeShellRequest("/api/tracked-products"), false);
  assert.equal(isSafeShellRequest("/some-future-private-page"), false);
});
