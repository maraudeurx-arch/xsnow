import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CHAT_TEXT_MAX,
  hostnameOfHttpUrl,
  isJsonContentType,
  looksLikeCoordinates,
  safeHttpUrl,
  sanitizeRecordId,
  sanitizeUntrustedText,
} from "./sanitize.ts";
import { CONTENT_SECURITY_POLICY } from "./csp.ts";

describe("sanitizeUntrustedText", () => {
  it("keeps ordinary French, English, and Spanish ideas", () => {
    assert.equal(
      sanitizeUntrustedText("Déneiger les allées du Plateau", { max: 500 }),
      "Déneiger les allées du Plateau",
    );
    assert.equal(
      sanitizeUntrustedText("I'd like a neighbourhood snow-removal rota", { max: 500 }),
      "I'd like a neighbourhood snow-removal rota",
    );
    assert.equal(
      sanitizeUntrustedText("Tengo una idea para el barrio", { max: 500 }),
      "Tengo una idea para el barrio",
    );
    assert.equal(sanitizeUntrustedText("a < b et merci <3", { max: 500 }), "a < b et merci <3");
  });

  it("strips script tags, event handlers, and javascript/data URLs", () => {
    const cleaned = sanitizeUntrustedText(
      '<script>alert(1)</script> Café <img src=x onerror="alert(1)"> javascript:alert(1) data:text/html,<h1>x</h1>',
      { max: 500, redactEmails: true },
    );
    assert.doesNotMatch(cleaned, /<script/i);
    assert.doesNotMatch(cleaned, /onerror/i);
    assert.doesNotMatch(cleaned, /javascript:/i);
    assert.doesNotMatch(cleaned, /data:/i);
    assert.match(cleaned, /Café/);
  });

  it("redacts emails, caps length, and drops GPS when asked", () => {
    assert.match(
      sanitizeUntrustedText("Écris-moi à ada@example.com merci", {
        max: 280,
        redactEmails: true,
      }),
      /\[redacted\]/,
    );
    assert.equal(sanitizeUntrustedText("a".repeat(300), { max: 280 }).length, 280);
    assert.equal(
      sanitizeUntrustedText("Meet at 45.4765, -75.7013", { dropCoordinates: true }),
      "",
    );
  });

  it("neutralizes base64 blobs and PEM/PDF-like payloads", () => {
    const blob = "A".repeat(80) + "==";
    const cleaned = sanitizeUntrustedText(`Idée ${blob} hello`, { max: 500 });
    assert.match(cleaned, /\[removed-binary\]/);
    assert.doesNotMatch(cleaned, /AAAAAAAAAA/);
    const pem = sanitizeUntrustedText(
      "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE----- plus une idée",
      { max: 500, allowNewlines: true },
    );
    assert.match(pem, /\[removed-binary\]/);
    assert.match(pem, /idée/);
  });

  it("is safe to run twice", () => {
    const once = sanitizeUntrustedText("<script>xss</script> Bonjour ada@opc.test", {
      max: 280,
      redactEmails: true,
    });
    const twice = sanitizeUntrustedText(once, { max: 280, redactEmails: true });
    assert.equal(once, twice);
  });

  it("treats non-strings as empty and strips nested/file payloads", () => {
    assert.equal(sanitizeUntrustedText(null), "");
    assert.equal(sanitizeUntrustedText(42), "");
    const nested = sanitizeUntrustedText(
      "<div><style>body{}</style><iframe src=javascript:1></iframe> Idée file://secret</div>",
      { max: 500 },
    );
    assert.doesNotMatch(nested, /<style|<iframe|file:/i);
    assert.match(nested, /Idée/);
  });
});

describe("safeHttpUrl", () => {
  it("allows http(s) and rejects javascript/data/relative", () => {
    assert.equal(safeHttpUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(safeHttpUrl("http://localhost:3000/xsnow/"), "http://localhost:3000/xsnow/");
    assert.equal(safeHttpUrl("javascript:alert(1)"), "");
    assert.equal(safeHttpUrl("data:text/html,hi"), "");
    assert.equal(safeHttpUrl("/internal"), "");
    assert.equal(hostnameOfHttpUrl("https://www.paypal.me/opc"), "www.paypal.me");
  });

  it("rejects file URLs, credentials, and non-strings", () => {
    assert.equal(safeHttpUrl("file:///etc/passwd"), "");
    assert.equal(safeHttpUrl("https://user:pass@example.com/secret"), "");
    assert.equal(safeHttpUrl(null), "");
    assert.equal(safeHttpUrl(undefined), "");
    assert.equal(hostnameOfHttpUrl("javascript:alert(1)"), "");
  });
});

describe("helpers", () => {
  it("validates JSON content-type and record ids", () => {
    assert.equal(isJsonContentType("application/json"), true);
    assert.equal(isJsonContentType("application/json; charset=utf-8"), true);
    assert.equal(isJsonContentType("text/html"), false);
    assert.equal(isJsonContentType(null), false);
    assert.equal(sanitizeRecordId("abc<script>"), "abcscript");
    assert.equal(looksLikeCoordinates("45.4765, -75.7013"), true);
    assert.equal(CHAT_TEXT_MAX, 4000);
  });
});

describe("CSP", () => {
  it("denies plugins and keeps wallet/worker connections possible", () => {
    assert.match(CONTENT_SECURITY_POLICY, /object-src 'none'/);
    assert.match(CONTENT_SECURITY_POLICY, /base-uri 'self'/);
    assert.match(CONTENT_SECURITY_POLICY, /connect-src 'self' https: wss:/);
    assert.match(CONTENT_SECURITY_POLICY, /wasm-unsafe-eval/);
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "out") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(tsx|ts|jsx|js)$/.test(name) && !name.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

describe("source audit", () => {
  it("never uses dangerouslySetInnerHTML or javascript: hrefs", () => {
    const files = [...walk("src"), ...walk("workers")];
    assert.ok(files.length > 10);
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      assert.equal(src.includes("dangerouslySetInnerHTML"), false, file);
      assert.doesNotMatch(src, /href\s*=\s*\{?\s*["'`]javascript:/i, file);
    }
  });
});
