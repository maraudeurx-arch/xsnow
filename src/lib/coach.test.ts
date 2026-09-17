import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import {
  COACH_PATH_HREF,
  coachComplete,
  nextCoachQuestion,
  parseCoachAnswers,
  promisesIncome,
  rankCoachPaths,
} from "./coach.ts";

describe("avatar coach", () => {
  it("asks intent then time, then returns 3–5 paths", () => {
    assert.equal(nextCoachQuestion({}), "intent");
    assert.equal(nextCoachQuestion({ intent: "skill" }), "time");
    assert.equal(nextCoachQuestion({ intent: "skill", time: "yes" }), null);
    assert.equal(coachComplete({ intent: "skill", time: "yes" }), true);

    const skill = rankCoachPaths({ intent: "skill", time: "yes" });
    assert.ok(skill.length >= 3 && skill.length <= 5);
    assert.equal(skill[0], "skills");
    assert.equal(skill.includes("earn"), true);
    assert.equal(COACH_PATH_HREF.skills, "/mes-services?template=skills");

    const later = rankCoachPaths({ intent: "explore", time: "later" });
    assert.equal(later[0], "ideas");
    assert.ok(later.length >= 3 && later.length <= 5);
  });

  it("never promises income in FR/EN/ES coach copy", () => {
    for (const pack of [fr, en, es]) {
      const blob = [
        pack.coach.lead,
        pack.coach.noIncome,
        pack.coach.pathsFoot,
        ...Object.values(pack.coach.paths).flatMap((path) => [path.label, path.hint]),
        pack.systemPrompt,
      ].join("\n");
      assert.equal(promisesIncome(blob), false);
      assert.match(pack.coach.noIncome, /promesse|promise|promesa/i);
    }
    assert.match(fr.coach.paths.earn.hint, /sans affiliation ni promesse de revenu/);
    assert.match(en.coach.paths.earn.hint, /no income promise/);
    assert.deepEqual(parseCoachAnswers({ intent: "help", time: "little" }), {
      intent: "help",
      time: "little",
    });
    assert.deepEqual(parseCoachAnswers({ intent: "nope" }), {});
  });
});
