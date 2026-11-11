import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import {
  TUTORAT_LEARN_LANGUAGES,
  isTutoratLearnLanguage,
} from "./tutorat-languages.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BOARD = join(HERE, "../components/features/EarnNowBoard.tsx");

const RETIRED_LABELS = [
  "Micro1",
  "TELUS Digital",
  "OneForma",
  "Mindrift",
  "italki",
  "Preply",
  "AmazingTalker",
];

describe("tutorat language choices", () => {
  it("exposes exactly French, English and Spanish as learnable languages", () => {
    assert.deepEqual([...TUTORAT_LEARN_LANGUAGES], ["francais", "anglais", "espagnol"]);
    assert.equal(isTutoratLearnLanguage("francais"), true);
    assert.equal(isTutoratLearnLanguage("anglais"), true);
    assert.equal(isTutoratLearnLanguage("espagnol"), true);
    assert.equal(isTutoratLearnLanguage("de"), false);
    assert.equal(isTutoratLearnLanguage("tutorat"), false);
  });

  it("labels the three choices in FR/EN/ES", () => {
    assert.equal(fr.earnNow.tutoratLanguages.francais, "Français");
    assert.equal(fr.earnNow.tutoratLanguages.anglais, "Anglais");
    assert.equal(fr.earnNow.tutoratLanguages.espagnol, "Espagnol");
    assert.equal(en.earnNow.tutoratLanguages.francais, "French");
    assert.equal(en.earnNow.tutoratLanguages.anglais, "English");
    assert.equal(en.earnNow.tutoratLanguages.espagnol, "Spanish");
    assert.equal(es.earnNow.tutoratLanguages.francais, "Francés");
    assert.equal(es.earnNow.tutoratLanguages.anglais, "Inglés");
    assert.equal(es.earnNow.tutoratLanguages.espagnol, "Español");
  });

  it("keeps the coming-soon copy honest: OPC tutors, in preparation, no income promise", () => {
    for (const [locale, messages] of [
      ["fr", fr],
      ["en", en],
      ["es", es],
    ] as const) {
      const soon = messages.earnNow.tutoratLanguages;
      const lead = messages.earnNow.onlineWorkLead;
      const blob = `${lead} ${soon.soonBody} ${soon.soonBadge}`;
      assert.match(blob, /OPC/i, locale);
      assert.match(blob, /prépar|prepar|being prepared|aún no abierto|not open yet/i, locale);
      assert.doesNotMatch(blob, /garanti|guaranteed|garantiza|gagneras|you will earn|ganarás/i, locale);
      assert.doesNotMatch(blob, /jumeau/i, locale);
      assert.ok(soon.soonBody.trim().length > 0, locale);
      assert.ok(soon.back.trim().length > 0, locale);
    }
  });

  it("drops retired telework and third-party tutor links from the earn board", () => {
    const source = readFileSync(BOARD, "utf8");
    assert.match(source, /TUTORAT_LEARN_LANGUAGES/);
    assert.doesNotMatch(source, /PAID_MISSION_LINKS|ONLINE_WORK_LINKS|paid-missions|online-work/);
    for (const label of RETIRED_LABELS) {
      assert.equal(source.includes(label), false, label);
    }
  });
});
