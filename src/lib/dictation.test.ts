import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyDictationError, dictationRetryLang } from "./dictation.ts";

// Garde-fou de la dictée (Indiana Lane (IA), via Regie, 07/11/2026) : une
// langue refusée (« language-not-supported ») ne doit jamais relancer la
// reconnaissance en boucle. Une seule relance, vers la langue de repli de
// la famille, et seulement si elle n'a pas déjà été essayée.
describe("dictation language retry guard", () => {
  it("offers the family fallback once for a refused first language", () => {
    assert.equal(dictationRetryLang("fr-CA", ["fr-CA"]), "fr-FR");
    assert.equal(dictationRetryLang("es-ES", ["es-ES"]), "es-MX");
    assert.equal(dictationRetryLang("es-US", ["es-US"]), "es-MX");
    assert.equal(dictationRetryLang("en-US", ["en-US"]), "en-GB");
    assert.equal(dictationRetryLang("en-CA", ["en-CA"]), "en-GB");
  });

  it("stops when the refused language IS the fallback (the old loop)", () => {
    // First attempts can already be fr-FR / es-MX / en-GB (locale hint):
    // the historical code relaunched the very same language forever.
    assert.equal(dictationRetryLang("fr-FR", ["fr-FR"]), null);
    assert.equal(dictationRetryLang("es-MX", ["es-MX"]), null);
    assert.equal(dictationRetryLang("en-GB", ["en-GB"]), null);
  });

  it("stops when the fallback was already tried in this start", () => {
    // fr-CA refused, fallback fr-FR refused too: no third attempt.
    assert.equal(dictationRetryLang("fr-FR", ["fr-CA", "fr-FR"]), null);
    assert.equal(dictationRetryLang("fr-CA", ["fr-CA", "fr-FR"]), null);
    assert.equal(dictationRetryLang("en-US", ["en-US", "en-GB"]), null);
  });

  it("never invents a fallback for unknown languages", () => {
    assert.equal(dictationRetryLang("de-DE", ["de-DE"]), null);
    assert.equal(dictationRetryLang("", []), null);
    assert.equal(dictationRetryLang("fr-BE", ["fr-BE"]), "fr-FR");
  });

  it("keeps classifying language refusal as unsupported", () => {
    assert.equal(classifyDictationError("language-not-supported"), "unsupported");
    assert.equal(classifyDictationError("not-allowed"), "permission");
    assert.equal(classifyDictationError("no-speech"), "silent");
  });
});
