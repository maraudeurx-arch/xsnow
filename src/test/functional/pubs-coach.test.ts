import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { en } from "../../lib/i18n/en.ts";
import { es } from "../../lib/i18n/es.ts";
import { fr } from "../../lib/i18n/fr.ts";
import { promisesIncome } from "../../lib/coach.ts";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const repoDir = join(srcDir, "..");

function read(rel: string) {
  return readFileSync(join(srcDir, rel), "utf8");
}

describe("pubs + coach + business AI surfaces", () => {
  it("ships the full-height ads reel route and worker draft path", () => {
    assert.equal(existsSync(join(srcDir, "app/pubs/page.tsx")), true);
    assert.equal(existsSync(join(srcDir, "app/coach/page.tsx")), true);
    assert.match(read("app/pubs/page.tsx"), /AdsVideoScreen/);
    assert.match(read("app/coach/page.tsx"), /AvatarCoach/);
    assert.match(read("components/AccueilMenu.tsx"), /\/pubs/);
    assert.match(read("components/AvatarChat.tsx"), /\/coach/);
    assert.match(readFileSync(join(repoDir, "workers/xsnow-chat/src/index.ts"), "utf8"), /isAdsDraftPath/);
    assert.match(read("components/features/BusinessBoard.tsx"), /draftBusinessAd/);
    assert.match(read("lib/business-draft.ts"), /no_facebook_scrape/);
    assert.doesNotMatch(read("lib/business-draft.ts"), /facebook\.com\/graphql|scrapeFacebook/);
  });

  it("keeps coach and ads copy free of income promises", () => {
    for (const pack of [fr, en, es]) {
      assert.equal(promisesIncome(pack.coach.noIncome), false);
      assert.equal(promisesIncome(pack.coach.paths.earn.hint), false);
      assert.match(pack.systemPrompt, /Never promise income|Ne promets jamais de revenu|Nunca prometas ingresos/);
    }
    assert.deepEqual(Object.keys(en.pubs), Object.keys(fr.pubs));
    assert.deepEqual(Object.keys(es.pubs), Object.keys(fr.pubs));
    assert.deepEqual(Object.keys(en.coach), Object.keys(fr.coach));
    assert.deepEqual(Object.keys(es.coach), Object.keys(fr.coach));
  });
});
