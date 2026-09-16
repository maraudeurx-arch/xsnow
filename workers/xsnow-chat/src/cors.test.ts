import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_ORIGINS,
  CORS_ALLOW_HEADERS,
  corsHeaders,
  isAllowedOrigin,
} from "./cors.ts";

describe("Worker CORS allowlist", () => {
  it("allows GitHub Pages, opencommunity.app, and local test hosts — never *", () => {
    assert.equal(ALLOWED_ORIGINS.has("*"), false);
    assert.equal(isAllowedOrigin("https://maraudeurx-arch.github.io"), true);
    assert.equal(isAllowedOrigin("https://opencommunity.app"), true);
    assert.equal(isAllowedOrigin("https://www.opencommunity.app"), true);
    assert.equal(isAllowedOrigin("http://localhost:3000"), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:3000"), true);
    assert.equal(isAllowedOrigin("http://localhost:4173"), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:4173"), true);
  });

  it("echoes the request Origin when it is on the allowlist", () => {
    const github = corsHeaders("https://maraudeurx-arch.github.io");
    assert.equal(github["Access-Control-Allow-Origin"], "https://maraudeurx-arch.github.io");
    assert.equal(github.Vary, "Origin");
    assert.match(github["Access-Control-Allow-Headers"] ?? "", /Content-Type/);
    assert.match(CORS_ALLOW_HEADERS, /Content-Type/);

    const custom = corsHeaders("https://opencommunity.app");
    assert.equal(custom["Access-Control-Allow-Origin"], "https://opencommunity.app");
    const www = corsHeaders("https://www.opencommunity.app");
    assert.equal(www["Access-Control-Allow-Origin"], "https://www.opencommunity.app");
  });

  it("omits Access-Control-Allow-Origin for unknown hosts so the browser blocks the POST", () => {
    const blocked = corsHeaders("https://ub.io");
    assert.equal(blocked["Access-Control-Allow-Origin"], undefined);
    assert.equal(isAllowedOrigin("https://ub.io"), false);
    assert.equal(isAllowedOrigin("https://evil.example"), false);
    assert.equal(isAllowedOrigin(null), false);
    assert.equal(isAllowedOrigin(""), false);
    const empty = corsHeaders(null);
    assert.equal(empty["Access-Control-Allow-Origin"], undefined);
    assert.equal(JSON.stringify(corsHeaders("https://ub.io")).includes("*"), false);
  });
});
