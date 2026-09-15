import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MICRO1_APPLY_URL, PROLIFIC_URL, USERTESTING_URL } from "./paid-missions.ts";

describe("paid mission links", () => {
  it("keeps the official micro1 apply URL and existing external sites", () => {
    assert.equal(
      MICRO1_APPLY_URL,
      "https://jobs.micro1.ai/post/8b1146d2-f854-4461-83e0-4c4bbde847e7",
    );
    assert.equal(PROLIFIC_URL, "https://www.prolific.com/");
    assert.equal(USERTESTING_URL, "https://www.usertesting.com/");
  });
});
