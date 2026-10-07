import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BASE_PAGE_EXTENSIONS,
  TUTORAT_FLAG,
  isTutoratEnabled,
  tutoratPageExtensions,
} from "./tutorat/flag.ts";
import { TUTORAT_COPY, getTutoratCopy } from "./tutorat/messages.ts";
import type { TutoratCopy } from "./tutorat/messages.ts";

const LOCALES = ["fr", "en", "es"] as const;

function flattenStrings(copy: TutoratCopy): string[] {
  return [
    copy.title,
    copy.lead,
    copy.badge,
    copy.adultsOnly,
    ...copy.sections.flatMap((section) => [section.heading, section.body]),
  ];
}

describe("isTutoratEnabled", () => {
  it("accepts exactly the trimmed value 1", () => {
    assert.equal(isTutoratEnabled({ [TUTORAT_FLAG]: "1" }), true);
    assert.equal(isTutoratEnabled({ [TUTORAT_FLAG]: " 1 " }), true);
  });

  it("rejects undefined, empty and any other value", () => {
    const rejected: (string | undefined)[] = [undefined, "", "0", "true", "yes", "01"];
    for (const value of rejected) {
      assert.equal(isTutoratEnabled({ [TUTORAT_FLAG]: value }), false);
    }
  });
});

describe("tutoratPageExtensions", () => {
  it("returns the base list without the flag", () => {
    const extensions = tutoratPageExtensions({});
    assert.deepEqual(extensions, [...BASE_PAGE_EXTENSIONS]);
    assert.equal(extensions.includes("tutorat.tsx"), false);
  });

  it("appends the tutorat extension when enabled", () => {
    const extensions = tutoratPageExtensions({ [TUTORAT_FLAG]: "1" });
    assert.deepEqual(extensions, [...BASE_PAGE_EXTENSIONS, "tutorat.tsx"]);
    assert.equal(extensions.includes("tutorat.tsx"), true);
  });

  it("returns a fresh array on every call", () => {
    const first = tutoratPageExtensions({});
    first.push("mutated");
    const second = tutoratPageExtensions({});
    assert.equal(second.includes("mutated"), false);
    assert.deepEqual(second, [...BASE_PAGE_EXTENSIONS]);
  });
});

describe("TUTORAT_COPY", () => {
  it("exposes exactly fr, en and es", () => {
    assert.deepEqual(Object.keys(TUTORAT_COPY).sort(), ["en", "es", "fr"]);
  });

  it("has no empty string", () => {
    for (const locale of LOCALES) {
      for (const value of flattenStrings(TUTORAT_COPY[locale])) {
        assert.equal(value.trim().length > 0, true);
      }
    }
  });

  it("has the same number of sections in every locale", () => {
    const counts = LOCALES.map((locale) => TUTORAT_COPY[locale].sections.length);
    assert.deepEqual(counts, [3, 3, 3]);
  });

  it("mentions the age barrier with 18 in every locale", () => {
    for (const locale of LOCALES) {
      assert.match(TUTORAT_COPY[locale].adultsOnly, /18/);
    }
  });

  it("keeps every placeholder free of links and addresses", () => {
    for (const locale of LOCALES) {
      for (const value of flattenStrings(TUTORAT_COPY[locale])) {
        assert.equal(value.includes("http"), false);
        assert.equal(value.includes("@"), false);
      }
    }
  });
});

describe("getTutoratCopy", () => {
  it("falls back to French for unknown locales", () => {
    assert.equal(getTutoratCopy("de"), TUTORAT_COPY.fr);
  });
});
