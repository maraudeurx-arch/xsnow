import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MICRO1_APPLY_URL,
  MINDRIFT_URL,
  ONEFORMA_URL,
  PAID_MISSION_LINKS,
  TELUS_DIGITAL_URL,
} from "./paid-missions.ts";

describe("paid mission links", () => {
  it("exposes four official platform URLs", () => {
    assert.equal(
      MICRO1_APPLY_URL,
      "https://jobs.micro1.ai/post/8b1146d2-f854-4461-83e0-4c4bbde847e7",
    );
    assert.equal(
      TELUS_DIGITAL_URL,
      "https://jobs.telusdigital.com/search/cfm5/ai-community/jobs",
    );
    assert.equal(ONEFORMA_URL, "https://www.oneforma.com/onboarding/");
    assert.equal(MINDRIFT_URL, "https://mindrift.ai/apply");
    assert.deepEqual(
      PAID_MISSION_LINKS.map((link) => link.label),
      ["Micro1", "TELUS Digital", "OneForma", "Mindrift"],
    );
    assert.equal(PAID_MISSION_LINKS.length, 4);
    for (const link of PAID_MISSION_LINKS) {
      assert.match(link.url, /^https:\/\//);
    }
  });
});
