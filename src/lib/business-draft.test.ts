import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adsDraftUrl,
  businessDraftSystemPrompt,
  looksLikeFacebookScrape,
  parseBusinessDraftInput,
  draftBusinessAd,
} from "./business-draft.ts";

describe("business ad AI draft", () => {
  it("rejects Facebook URLs and scrape phrasing", () => {
    assert.equal(looksLikeFacebookScrape("https://www.facebook.com/cafe"), true);
    assert.equal(looksLikeFacebookScrape("fb.com/marketplace/item/1"), true);
    assert.equal(looksLikeFacebookScrape("please scrape facebook for my page"), true);
    assert.equal(looksLikeFacebookScrape("Café du coin, Hull"), false);
    assert.equal(
      parseBusinessDraftInput({
        name: "Café",
        notes: "Copie depuis https://facebook.com/cafe",
      }).error,
      "no_facebook_scrape",
    );
  });

  it("requires a name and keeps Workers AI instructions off Facebook", () => {
    assert.equal(parseBusinessDraftInput({}).error, "bad_request");
    const parsed = parseBusinessDraftInput({
      name: "Café du coin",
      category: "Café",
      city: "Gatineau",
      notes: "Brunch le samedi",
      locale: "fr",
    });
    assert.equal("error" in parsed, false);
    if ("error" in parsed) return;
    assert.equal(parsed.name, "Café du coin");
    assert.match(businessDraftSystemPrompt("fr"), /Never scrape or mention Facebook/);
    assert.match(adsDraftUrl("https://xsnow-chat.xsnowopc.workers.dev"), /\/ads\/draft$/);
  });

  it("posts to /ads/draft and reads the draft field", async () => {
    const result = await draftBusinessAd(
      { name: "Atelier", city: "Gatineau", locale: "fr" },
      {
        fetch: async () =>
          new Response(JSON.stringify({ draft: "Atelier local à Gatineau." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      },
    );
    assert.equal(result.ok, true);
    if (result.ok) assert.match(result.draft, /Atelier/);

    const blocked = await draftBusinessAd({
      name: "Page",
      notes: "https://fb.me/x",
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.error, "no_facebook_scrape");
  });
});
