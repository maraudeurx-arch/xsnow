import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canOpenPersonaStep,
  clearPersonaDeposit,
  emptyPersonaConsentChecks,
  emptyPersonaDeposit,
  loadPersonaDeposit,
  newPersonaDepositId,
  personaConsentComplete,
  personaDepositEndpoint,
  personaDepositMeta,
  nextPersonaStep,
  prevPersonaStep,
  personaVisibleSteps,
  recordPersonaChoice,
  uploadPersonaDeposit,
  withdrawPersonaDeposit,
  personaFileIssue,
  personaFurthestStep,
  personaStepSatisfied,
  PERSONA_CONSENT_TEXT_VERSION,
  PERSONA_DEPOSIT_ROUTE,
  PERSONA_IMAGE_MAX_BYTES,
  PERSONA_VIDEO_MAX_BYTES,
  pickRecorderMimeType,
  parsePersonaDeposit,
  recordPersonaConsent,
  recordPersonaMedia,
  savePersonaDeposit,
  PERSONA_AUDIO_MIME_CANDIDATES,
  type PersonaDeposit,
} from "./persona-deposit.ts";
import {
  loadPersonaMedia,
  personaMediaKey,
  savePersonaMedia,
  deletePersonaMedia,
  setPersonaMediaStoreForTests,
} from "./persona-media.ts";
import { PERSONA_COLLECTION_ENABLED } from "./persona-deposit.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import {
  resetDurableMemoryForTests,
  setDurableBackupForTests,
} from "./durable-storage.ts";

const NOW = 1_730_000_000_000;

function freshDeposit(): PersonaDeposit {
  return emptyPersonaDeposit(newPersonaDepositId(NOW, 0.5), NOW, () => 0.42);
}

function chosen(offer = { voice: true, image: true }): PersonaDeposit {
  return recordPersonaChoice(freshDeposit(), { offer, pseudonym: "Joase", country: "Haïti" }, NOW + 1);
}

function consented(offer = { voice: true, image: true }): PersonaDeposit {
  return recordPersonaConsent(chosen(offer), NOW + 1);
}

function withVoice(): PersonaDeposit {
  return recordPersonaMedia(consented(), "voice", { type: "audio/webm", size: 120_000 }, NOW + 2);
}

function withMedia(): PersonaDeposit {
  const d = withVoice();
  const withImage = recordPersonaMedia(d, "image", { type: "image/jpeg", size: 800_000 }, NOW + 3);
  return recordPersonaMedia(withImage, "video", { type: "video/mp4", size: 9_000_000 }, NOW + 4);
}

function complete(): PersonaDeposit {
  return recordPersonaMedia(withMedia(), "selfie", { type: "video/webm", size: 3_000_000 }, NOW + 5);
}

describe("monétise-toi — porte de consentement", () => {
  it("requires all four attestations, including 18+ and own voice/image only", () => {
    const none = emptyPersonaConsentChecks();
    assert.equal(personaConsentComplete(none), false);
    assert.equal(personaConsentComplete({ ...none, terms: true }), false);
    assert.equal(personaConsentComplete({ ...none, terms: true, adult: true, compensation: true }), false);
    assert.equal(personaConsentComplete({ terms: true, adult: false, compensation: true, selfOnly: true }), false);
    assert.equal(personaConsentComplete({ terms: true, adult: true, compensation: true, selfOnly: true }), true);
  });

  it("records the acceptance with timestamp and the current text version", () => {
    const d = consented();
    assert.equal(d.consent?.acceptedAt, NOW + 1);
    assert.equal(d.consent?.textVersion, PERSONA_CONSENT_TEXT_VERSION);
    assert.equal(PERSONA_CONSENT_TEXT_VERSION, "indiana-v1-2026-11-10");
  });

  it("keeps every later step closed until the choice and the consent are recorded", () => {
    const d = freshDeposit();
    assert.equal(personaFurthestStep(d), "choice");
    assert.equal(canOpenPersonaStep(d, "consent"), false);
    assert.equal(personaFurthestStep(chosen()), "consent");
    for (const step of ["voice", "media", "biometry", "done"] as const) {
      assert.equal(canOpenPersonaStep(chosen(), step), false);
    }
    assert.equal(personaStepSatisfied(chosen(), "consent"), false);
  });

  it("a consent given on an older (provisional) text must be given again", () => {
    const parsed = parsePersonaDeposit({ ...consented(), consent: { acceptedAt: NOW, textVersion: "provisoire-2026-11-07-r2" } });
    assert.equal(parsed?.consent, null);
  });
});

describe("monétise-toi — choix voix et/ou image", () => {
  it("needs at least one offer, a pseudonym and a country", () => {
    assert.equal(personaFurthestStep(recordPersonaChoice(freshDeposit(), { offer: { voice: false, image: false }, pseudonym: "Joase", country: "Haïti" }, NOW)), "choice");
    assert.equal(personaFurthestStep(recordPersonaChoice(freshDeposit(), { offer: { voice: true, image: false }, pseudonym: "", country: "Haïti" }, NOW)), "choice");
  });

  it("voice only skips the image step; image only skips the voice step", () => {
    const voiceOnly = consented({ voice: true, image: false });
    assert.deepEqual(personaVisibleSteps(voiceOnly), ["choice", "consent", "voice", "biometry", "done"]);
    assert.equal(nextPersonaStep(voiceOnly, "voice"), "biometry");
    assert.equal(canOpenPersonaStep(voiceOnly, "media"), false);
    const v = recordPersonaMedia(voiceOnly, "voice", { type: "audio/webm", size: 5 }, NOW);
    assert.equal(personaFurthestStep(v), "biometry");

    const imageOnly = consented({ voice: false, image: true });
    assert.equal(nextPersonaStep(imageOnly, "consent"), "media");
    assert.equal(prevPersonaStep(imageOnly, "media"), "consent");
    assert.equal(personaFurthestStep(imageOnly), "media");
  });

  it("a withdrawn dossier (media erased) stays on the final screen", () => {
    assert.equal(personaFurthestStep({ ...complete(), media: {}, status: "retire" }), "done");
  });

  it("carries a 6-digit code for the selfie (liveness / self-only check)", () => {
    assert.match(freshDeposit().livenessCode, /^[0-9]{6}$/);
  });
});

describe("monétise-toi — transitions d'étapes", () => {
  it("walks choice → consent → voice → media → biometry → done, one requirement at a time", () => {
    assert.equal(personaFurthestStep(consented()), "voice");
    assert.equal(canOpenPersonaStep(consented(), "media"), false);
    assert.equal(personaFurthestStep(withVoice()), "media");
    const imageOnly = recordPersonaMedia(withVoice(), "image", { type: "image/png", size: 10 }, NOW + 6);
    assert.equal(personaFurthestStep(imageOnly), "media");
    assert.equal(personaStepSatisfied(imageOnly, "media"), false);
    assert.equal(personaFurthestStep(withMedia()), "biometry");
    assert.equal(personaFurthestStep(complete()), "done");
    assert.equal(personaStepSatisfied(complete(), "done"), true);
  });

  it("lets the person revisit earlier steps but never skip ahead", () => {
    const d = withMedia();
    for (const step of ["choice", "consent", "voice", "media", "biometry"] as const) {
      assert.equal(canOpenPersonaStep(d, step), true);
    }
    assert.equal(canOpenPersonaStep(d, "done"), false);
  });

  it("never fabricates a verified status — a finished deposit is only « en vérification »", () => {
    assert.equal(complete().status, "en-cours");
    assert.ok(!JSON.stringify(personaDepositMeta(complete())).includes("verifi"));
  });
});

describe("monétise-toi — validation des fichiers", () => {
  it("accepts the documented image and video types within the ceilings", () => {
    assert.equal(personaFileIssue("image", { type: "image/jpeg", size: 1_000 }), null);
    assert.equal(personaFileIssue("image", { type: "image/webp", size: PERSONA_IMAGE_MAX_BYTES }), null);
    assert.equal(personaFileIssue("video", { type: "video/mp4", size: 30_000_000 }), null);
    assert.equal(personaFileIssue("selfie", { type: "video/quicktime", size: 30_000_000 }), null);
  });

  it("refuses empty files, wrong types and oversize files with distinct issues", () => {
    assert.equal(personaFileIssue("image", { type: "image/jpeg", size: 0 }), "empty");
    assert.equal(personaFileIssue("image", { type: "image/gif", size: 1_000 }), "type");
    assert.equal(personaFileIssue("image", { type: "application/pdf", size: 1_000 }), "type");
    assert.equal(personaFileIssue("image", { type: "image/png", size: PERSONA_IMAGE_MAX_BYTES + 1 }), "size");
    assert.equal(personaFileIssue("video", { type: "video/avi", size: 1_000 }), "type");
    assert.equal(personaFileIssue("video", { type: "video/webm", size: PERSONA_VIDEO_MAX_BYTES + 1 }), "size");
  });
});

describe("monétise-toi — persistance des métadonnées", () => {
  it("round-trips a deposit through durable storage", () => {
    resetDurableMemoryForTests();
    setDurableBackupForTests(new Map());
    const d = complete();
    savePersonaDeposit(d);
    assert.deepEqual(loadPersonaDeposit(), d);
    clearPersonaDeposit();
    assert.equal(loadPersonaDeposit(), null);
    resetDurableMemoryForTests();
    setDurableBackupForTests(null);
  });

  it("parses defensively: bad ids and junk fields are dropped", () => {
    assert.equal(parsePersonaDeposit(null), null);
    assert.equal(parsePersonaDeposit({ id: "pas-un-dossier" }), null);
    const parsed = parsePersonaDeposit({
      id: "persona-abc-1234",
      createdAt: NOW,
      consent: { acceptedAt: NOW, textVersion: PERSONA_CONSENT_TEXT_VERSION, junk: true },
      media: { voice: { type: "audio/webm", size: 5 }, hacker: { type: "x", size: 1 } },
      status: "verifie-a-vie",
      upload: "envoye",
    });
    assert.equal(parsed?.consent?.acceptedAt, NOW);
    assert.deepEqual(Object.keys(parsed?.media ?? {}), ["voice"]);
    assert.equal(parsed?.status, "en-cours");
    assert.equal(parsed?.upload, "pending");
  });

  it("builds stable, readable dossier ids", () => {
    assert.match(newPersonaDepositId(NOW, 0.5), /^persona-[a-z0-9]+-[0-9a-f]{4}$/);
    assert.equal(newPersonaDepositId(NOW, 0.5), newPersonaDepositId(NOW, 0.5));
  });
});

describe("monétise-toi — coffre média (IndexedDB, simulé)", () => {
  it("stores, reads back and deletes blobs per deposit and kind", async () => {
    const store = new Map<string, Blob>();
    setPersonaMediaStoreForTests(store);
    const blob = new Blob(["voix"], { type: "audio/webm" });
    assert.equal(await savePersonaMedia("persona-abc-1234", "voice", blob), true);
    assert.equal(store.has(personaMediaKey("persona-abc-1234", "voice")), true);
    const back = await loadPersonaMedia("persona-abc-1234", "voice");
    assert.equal(back?.type, "audio/webm");
    assert.equal(back?.size, blob.size);
    assert.equal(await loadPersonaMedia("persona-abc-1234", "image"), null);
    await deletePersonaMedia("persona-abc-1234", "voice");
    assert.equal(await loadPersonaMedia("persona-abc-1234", "voice"), null);
    setPersonaMediaStoreForTests(null);
  });
});

describe("monétise-toi — envoi vers la banque et retrait", () => {
  it("targets the Worker bank route", () => {
    assert.equal(PERSONA_DEPOSIT_ROUTE, "/persona-deposits");
    assert.equal(personaDepositEndpoint("https://worker.example/"), "https://worker.example/persona-deposits");
  });

  it("sends the consent record and only the media of the chosen offer — never an amount", async () => {
    const d = recordPersonaMedia(
      recordPersonaMedia(consented({ voice: true, image: false }), "voice", { type: "audio/webm", size: 4 }, NOW),
      "selfie",
      { type: "video/webm", size: 4 },
      NOW,
    );
    let sent: FormData | null = null;
    const fake = (async (_u: unknown, init?: RequestInit) => {
      sent = init?.body as FormData;
      return new Response(JSON.stringify({ ok: true, accepted: true, withdrawToken: "t".repeat(43) }), { status: 200 });
    }) as typeof fetch;
    const res = await uploadPersonaDeposit(d, async (k) => new Blob([k], { type: k === "voice" ? "audio/webm" : "video/webm" }), fake, "https://w.example");
    assert.deepEqual(res, { result: "sent", withdrawToken: "t".repeat(43) });
    const form = sent as unknown as FormData;
    assert.ok(form.get("voice") && form.get("selfie"));
    assert.equal(form.get("image"), null);
    const meta = JSON.parse(String(form.get("meta")));
    assert.equal(meta.consent.adult, true);
    assert.equal(meta.consent.version, PERSONA_CONSENT_TEXT_VERSION);
    assert.ok(!/amount|price|montant/i.test(JSON.stringify(meta)));
  });

  it("reports « not-configured » honestly when the bank storage is not open, « failed » on errors", async () => {
    const d = complete();
    const blob = async () => new Blob(["x"], { type: "video/webm" });
    const notConf = (async () => new Response(JSON.stringify({ error: "storage_not_configured" }), { status: 503 })) as typeof fetch;
    assert.equal((await uploadPersonaDeposit(d, blob, notConf)).result, "not-configured");
    const boom = (async () => { throw new Error("network"); }) as typeof fetch;
    assert.equal((await uploadPersonaDeposit(d, blob, boom)).result, "failed");
    const noToken = (async () => new Response(JSON.stringify({ ok: true, accepted: true }), { status: 200 })) as typeof fetch;
    assert.equal((await uploadPersonaDeposit(d, blob, noToken)).result, "failed");
    assert.equal((await uploadPersonaDeposit(d, async () => null, noToken)).result, "failed");
  });

  it("withdraws with the on-device token only", async () => {
    const d = { ...complete(), withdrawToken: "t".repeat(43), upload: "sent" as const };
    let body = "";
    const ok = (async (_u: unknown, init?: RequestInit) => {
      body = String(init?.body);
      return new Response(JSON.stringify({ ok: true, status: "revoked" }), { status: 200 });
    }) as typeof fetch;
    assert.equal(await withdrawPersonaDeposit(d, ok), "withdrawn");
    assert.deepEqual(JSON.parse(body), { id: d.id, token: "t".repeat(43) });
    assert.equal(await withdrawPersonaDeposit({ ...d, withdrawToken: "" }, ok), "failed");
  });
});

describe("monétise-toi — collecte ouverte (Popol, 09/11/2026)", () => {
  it("the collection is ON with Indiana's consent text v1", () => {
    assert.equal(PERSONA_COLLECTION_ENABLED, true);
  });

  it("the consent covers scope, 18+, own image only, withdrawal + real deletion, forbidden uses, no income guarantee — FR, EN, ES", () => {
    const locales = [
      { items: fr.earnNow.personaMonetise.consentItems.join("\n"), formula: /18 ans ou plus, résidant dans un pays en développement \(hors Canada, États-Unis et Europe\)/, deceive: /faire croire/, income: /Aucun revenu garanti/, withdraw: /Retrait en tout temps, suppression réelle/, scope: /Usage permis/, own: /ta propre voix et ta propre image/ },
      { items: en.earnNow.personaMonetise.consentItems.join("\n"), formula: /18 or older, living in a developing country \(excluding Canada, the United States and Europe\)/, deceive: /believe you really said/, income: /No income guaranteed/, withdraw: /Withdraw any time, real deletion/, scope: /Allowed use/, own: /your own voice and your own image/ },
      { items: es.earnNow.personaMonetise.consentItems.join("\n"), formula: /18 años o más, residentes en un país en desarrollo \(fuera de Canadá, Estados Unidos y Europa\)/, deceive: /hacer creer/, income: /Ningún ingreso garantizado/, withdraw: /Retiro en cualquier momento, borrado real/, scope: /Uso permitido/, own: /tu propia voz y tu propia imagen/ },
    ];
    for (const l of locales) {
      for (const re of [l.formula, l.deceive, l.income, l.withdraw, l.scope, l.own]) assert.match(l.items, re);
      assert.match(l.items, /sexuels|sexual|sexuales/);
      assert.match(l.items, /politiques|political|político/);
      assert.match(l.items, /illégal|illegal|ilegal/);
      assert.match(l.items, /PIPEDA|LPRPDE/);
      assert.match(l.items, /opencommunity\.opc@gmail\.com/);
      assert.doesNotMatch(l.items, /\[[^\]]+]/, "no bracketed placeholder left");
      assert.doesNotMatch(l.items, /Québec|Quebec|Quebe/i);
      assert.doesNotMatch(l.items, /\$|USD|CAD|€/, "no amount promised to lenders");
    }
  });

  it("no copy still says the journey is closed", () => {
    for (const stub of [fr.stubs.monetise, en.stubs.monetise, es.stubs.monetise]) {
      assert.doesNotMatch(stub, /En préparation|In preparation|En preparación/);
    }
  });

  it("deposit journey copy no longer names Jumeau / Twin / Gemelo (Popol, 10/11/2026)", () => {
    for (const lang of [fr, en, es]) {
      const p = lang.earnNow.personaMonetise;
      const corpus = [
        p.lead,
        p.deviceNote,
        p.voiceScript,
        p.withdrawLead,
        ...p.consentItems,
        lang.features.monetise.lead,
        lang.stubs.monetise,
      ].join("\n");
      assert.doesNotMatch(corpus, /jumeau/i);
      assert.doesNotMatch(corpus, /\btwin\b/i);
      assert.doesNotMatch(corpus, /gemelo/i);
    }
  });
});

describe("monétise-toi — choix du format d'enregistrement", () => {
  it("picks the first supported mime and falls back to the browser default", () => {
    assert.equal(
      pickRecorderMimeType(PERSONA_AUDIO_MIME_CANDIDATES, (m) => m === "audio/mp4"),
      "audio/mp4",
    );
    assert.equal(pickRecorderMimeType(PERSONA_AUDIO_MIME_CANDIDATES, () => false), "");
    assert.equal(
      pickRecorderMimeType(PERSONA_AUDIO_MIME_CANDIDATES, () => {
        throw new Error("nope");
      }),
      "",
    );
  });
});
