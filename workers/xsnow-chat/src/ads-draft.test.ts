import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleAdsDraft, isAdsDraftPath } from "./ads-draft.ts";

describe("Worker ads draft", () => {
  it("matches /ads/draft and refuses Facebook scrape before AI", async () => {
    assert.equal(isAdsDraftPath("/ads/draft"), true);
    assert.equal(isAdsDraftPath("/ads/draft/"), true);
    assert.equal(isAdsDraftPath("/ideas"), false);

    const blocked = await handleAdsDraft(
      { name: "Café", notes: "https://www.facebook.com/cafe" },
      { AI: { run: async () => ({ response: "should not run" }) } },
    );
    assert.equal(blocked.status, 400);
    assert.equal(blocked.data.error, "no_facebook_scrape");
  });

  it("returns a sanitized draft from Workers AI", async () => {
    const result = await handleAdsDraft(
      { name: "Café du coin", city: "Gatineau", locale: "fr" },
      {
        AI: {
          async run(_model, inputs) {
            const messages = inputs.messages as Array<{ role: string; content: string }>;
            assert.equal(messages[0]?.role, "system");
            assert.match(messages[0]?.content ?? "", /Never scrape or mention Facebook/);
            assert.match(messages[1]?.content ?? "", /Café du coin/);
            return { response: "Café du coin, café de quartier à Gatineau." };
          },
        },
      },
    );
    assert.equal(result.status, 200);
    assert.equal(result.data.draft, "Café du coin, café de quartier à Gatineau.");
  });
});
