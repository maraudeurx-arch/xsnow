import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { arbiterMail, parseArbiterMailKind } from "./arbiter-mail.ts";

describe("arbiter-mail rescan", () => {
  it("parses the rescan kind", () => {
    assert.equal(parseArbiterMailKind("rescan"), "rescan");
    assert.equal(parseArbiterMailKind("x"), null);
  });
  it("FR text: subject, scan step, contact, signature, no authority words", () => {
    const m = arbiterMail("rescan", "fr");
    assert.equal(m.subject, "Vérification d’identité – dernière étape");
    assert.match(m.text, /refaire le scan du visage/);
    assert.match(m.text, /opencommunity\.opc@gmail\.com/);
    assert.match(m.text, /La direction d’OPC$/);
    assert.doesNotMatch(m.text, /\b(cour|tribunal|court)\b/i);
  });
  it("EN and ES exist", () => {
    assert.match(arbiterMail("rescan", "en").text, /face scan/);
    assert.match(arbiterMail("rescan", "es").text, /escaneo del rostro/);
  });
});
