import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

// Public wording rule (Popol): never « solidaire » / solidarity in any language.
test("no « solidaire » wording in public i18n", () => {
  for (const lang of ["fr", "en", "es"]) {
    const src = readFileSync(new URL(`./i18n/${lang}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /solidair|solidari|solidár/i, `${lang}.ts`);
  }
});
