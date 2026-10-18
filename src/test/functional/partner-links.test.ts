import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

describe("Liens partenaires block (draft, flag OFF)", () => {
  it("EarnNowBoard renders the block only behind the flag", () => {
    const board = read("components/features/EarnNowBoard.tsx");
    assert.match(board, /isPartnerLinksEnabled\(\) \? <PartnerLinksBlock \/> : null/);
  });

  it("the block never posts anything and keeps the box unchecked by default", () => {
    const block = read("components/features/PartnerLinksBlock.tsx");
    const lib = read("lib/partner-links.ts");
    for (const source of [block, lib]) {
      assert.doesNotMatch(source, /fetch\(|sendBeacon|XMLHttpRequest|postIdea|track\(/);
    }
    assert.match(block, /type="checkbox"/);
    assert.match(block, /\(\) => false,/);
    assert.doesNotMatch(block, /defaultChecked/);
    assert.match(block, /aria-describedby=\{consentId\}/);
    assert.match(block, /htmlFor=\{checkboxId\}/);
  });

  it("ships no real referral code or link", () => {
    const lib = read("lib/partner-links.ts");
    assert.doesNotMatch(lib, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    assert.doesNotMatch(lib, /url: "https?:/);
  });
});
