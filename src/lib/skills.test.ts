import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPublishSkills,
  parseAvailabilityDays,
  parseSkillIds,
  sanitizeSkillOther,
  skillFormIssues,
  skillsFallbackTitle,
  skillsNotes,
} from "./skills.ts";

describe("skills listing helpers", () => {
  it("keeps known skills in display order and drops junk", () => {
    assert.deepEqual(parseSkillIds(["other", "mechanic", "mechanic", "hacker", "<script>"]), [
      "mechanic",
      "other",
    ]);
    assert.deepEqual(parseSkillIds("mechanic"), []);
    assert.deepEqual(parseSkillIds(null), []);
  });

  it("keeps weekdays in week order and drops junk", () => {
    assert.deepEqual(parseAvailabilityDays(["dim", "lun", "lun", "nope"]), ["lun", "dim"]);
    assert.deepEqual(parseAvailabilityDays("lun"), []);
  });

  it("sanitizes Autres UGC", () => {
    assert.equal(sanitizeSkillOther("<script>alert(1)</script>Soudure"), "Soudure");
    assert.equal(sanitizeSkillOther("moi@evil.test"), "");
    assert.equal(sanitizeSkillOther("a".repeat(200)).length <= 80, true);
  });

  it("requires a skill, Autres text when selected, a day, and hours", () => {
    assert.deepEqual(skillFormIssues({}), ["skills", "days", "hours"]);
    assert.ok(
      skillFormIssues({
        skillIds: ["other"],
        skillOther: "",
        availabilityDays: ["lun"],
        windowFrom: "08:00",
        windowTo: "18:00",
      }).includes("other"),
    );
    assert.equal(
      canPublishSkills({
        skillIds: ["plumber", "other"],
        skillOther: "Soudure",
        availabilityDays: ["sam", "dim"],
        windowFrom: "09:00",
        windowTo: "12:00",
      }),
      true,
    );
  });

  it("builds a plain-text French fallback title", () => {
    assert.equal(skillsFallbackTitle(["mechanic", "plumber"], ""), "Mécanicien, Plombier");
    assert.equal(skillsFallbackTitle(["other"], "Jardinage"), "Jardinage");
    assert.equal(skillsFallbackTitle([], ""), "Mes compétences");
    assert.doesNotMatch(skillsFallbackTitle(["other"], "<b>Hack</b>"), /<b>/);
  });

  it("stores days and Autres in notes without HTML", () => {
    const notes = skillsNotes(["lun", "ven"], "<img>Peinture");
    assert.match(notes, /lun,ven/);
    assert.match(notes, /Peinture/);
    assert.doesNotMatch(notes, /<img>/);
  });
});
