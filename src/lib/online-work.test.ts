import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AMAZINGTALKER_FRENCH_URL,
  ITALKI_TEACH_URL,
  ONLINE_WORK_LINKS,
  PREPLY_TEACH_URL,
} from "./online-work.ts";

describe("online work links", () => {
  it("exposes official French-teaching platform URLs", () => {
    assert.equal(ITALKI_TEACH_URL, "https://teach.italki.com/application");
    assert.equal(PREPLY_TEACH_URL, "https://preply.com/en/teach");
    assert.equal(
      AMAZINGTALKER_FRENCH_URL,
      "https://en.amazingtalker.com/apply-to-teach/french",
    );
    assert.equal(ONLINE_WORK_LINKS.length, 3);
    for (const link of ONLINE_WORK_LINKS) {
      assert.match(link.url, /^https:\/\//);
      assert.ok(link.label.length > 0);
    }
  });
});
