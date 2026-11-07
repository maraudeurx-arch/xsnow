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
  personaDepositNotice,
  personaFileIssue,
  personaFurthestStep,
  personaStepSatisfied,
  PERSONA_CONSENT_TEXT_VERSION,
  PERSONA_DEPOSIT_ROUTE,
  PERSONA_IMAGE_MAX_BYTES,
  PERSONA_VIDEO_MAX_BYTES,
  pickRecorderMimeType,
  postPersonaDepositNotice,
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
  return emptyPersonaDeposit(newPersonaDepositId(NOW, 0.5), NOW);
}

function consented(): PersonaDeposit {
  return recordPersonaConsent(freshDeposit(), NOW + 1);
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
  it("requires all three attestations, including 18+", () => {
    const none = emptyPersonaConsentChecks();
    assert.equal(personaConsentComplete(none), false);
    assert.equal(personaConsentComplete({ ...none, terms: true }), false);
    assert.equal(personaConsentComplete({ ...none, terms: true, adult: true }), false);
    assert.equal(personaConsentComplete({ terms: true, adult: true, compensation: true }), true);
  });

  it("records the acceptance with timestamp and text version", () => {
    const d = consented();
    assert.equal(d.consent?.acceptedAt, NOW + 1);
    assert.equal(d.consent?.textVersion, PERSONA_CONSENT_TEXT_VERSION);
  });

  it("keeps every later step closed until consent is recorded", () => {
    const d = freshDeposit();
    assert.equal(personaFurthestStep(d), "consent");
    assert.equal(canOpenPersonaStep(d, "consent"), true);
    assert.equal(canOpenPersonaStep(d, "voice"), false);
    assert.equal(canOpenPersonaStep(d, "media"), false);
    assert.equal(canOpenPersonaStep(d, "biometry"), false);
    assert.equal(canOpenPersonaStep(d, "done"), false);
    assert.equal(personaStepSatisfied(d, "consent"), false);
  });
});

describe("monétise-toi — transitions d'étapes", () => {
  it("walks consent → voice → media → biometry → done, one requirement at a time", () => {
    assert.equal(personaFurthestStep(consented()), "voice");
    assert.equal(canOpenPersonaStep(consented(), "media"), false);

    assert.equal(personaFurthestStep(withVoice()), "media");
    // Only the image: the media step still needs the video too.
    const imageOnly = recordPersonaMedia(
      withVoice(),
      "image",
      { type: "image/png", size: 10 },
      NOW + 6,
    );
    assert.equal(personaFurthestStep(imageOnly), "media");
    assert.equal(personaStepSatisfied(imageOnly, "media"), false);

    assert.equal(personaFurthestStep(withMedia()), "biometry");
    assert.equal(personaFurthestStep(complete()), "done");
    assert.equal(personaStepSatisfied(complete(), "done"), true);
  });

  it("lets the person revisit earlier steps but never skip ahead", () => {
    const d = withMedia();
    assert.equal(canOpenPersonaStep(d, "consent"), true);
    assert.equal(canOpenPersonaStep(d, "voice"), true);
    assert.equal(canOpenPersonaStep(d, "media"), true);
    assert.equal(canOpenPersonaStep(d, "biometry"), true);
    assert.equal(canOpenPersonaStep(d, "done"), false);
  });

  it("never fabricates a verified status — a finished deposit is only « en vérification »", () => {
    const d = complete();
    assert.equal(d.status, "en-cours");
    const notice = personaDepositNotice({ ...d, status: "en-verification" });
    assert.equal(notice.status, "en-verification");
  });
});

describe("monétise-toi — validation des fichiers", () => {
  it("accepts the documented image and video types within the ceilings", () => {
    assert.equal(personaFileIssue("image", { type: "image/jpeg", size: 1_000 }), null);
    assert.equal(personaFileIssue("image", { type: "image/webp", size: PERSONA_IMAGE_MAX_BYTES }), null);
    assert.equal(personaFileIssue("video", { type: "video/mp4", size: 50_000_000 }), null);
    assert.equal(personaFileIssue("selfie", { type: "video/quicktime", size: 50_000_000 }), null);
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
      consent: { acceptedAt: NOW, textVersion: "x", junk: true },
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

describe("monétise-toi — avis d'envoi best-effort", () => {
  it("targets the single proposed route constant", () => {
    assert.equal(PERSONA_DEPOSIT_ROUTE, "/persona-deposits");
    assert.equal(
      personaDepositEndpoint("https://worker.example/"),
      "https://worker.example/persona-deposits",
    );
  });

  it("sends metadata only — never media bytes, never an amount", () => {
    const notice = personaDepositNotice(complete());
    const json = JSON.stringify(notice);
    assert.equal(notice.id, complete().id);
    assert.deepEqual(Object.keys(notice.media).sort(), ["image", "selfie", "video", "voice"]);
    assert.ok(!/amount|price|montant|compensation/i.test(json.replace(/persona/g, "")));
  });

  it("fails cleanly when the route is absent or errors, succeeds only on ok+accepted", async () => {
    const d = complete();
    const notFound = (async () =>
      new Response(JSON.stringify({ ok: false }), { status: 404 })) as typeof fetch;
    assert.equal(await postPersonaDepositNotice(d, notFound), "failed");

    const boom = (async () => {
      throw new Error("network");
    }) as typeof fetch;
    assert.equal(await postPersonaDepositNotice(d, boom), "failed");

    const okButNotAccepted = (async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;
    assert.equal(await postPersonaDepositNotice(d, okButNotAccepted), "failed");

    const accepted = (async () =>
      new Response(JSON.stringify({ ok: true, accepted: true }), { status: 200 })) as typeof fetch;
    assert.equal(await postPersonaDepositNotice(d, accepted), "sent");
  });
});

describe("monétise-toi — drapeau de collecte (cadrage Indiana, 07/11/2026)", () => {
  it("stays OFF by default: nothing is collected before the consent text is validated", () => {
    assert.equal(PERSONA_COLLECTION_ENABLED, false);
  });

  it("the provisional consent copy covers Indiana's six points in FR, EN and ES", () => {
    const locales = [
      {
        items: fr.earnNow.personaMonetise.consentItems.join("\n"),
        country: /pays admissible/,
        deceive: /tromper/,
        income: /Aucun revenu garanti/,
        withdraw: /Retrait en tout temps/,
      },
      {
        items: en.earnNow.personaMonetise.consentItems.join("\n"),
        country: /eligible country/,
        deceive: /deceive/,
        income: /No guaranteed income/,
        withdraw: /Withdrawal at any time/,
      },
      {
        items: es.earnNow.personaMonetise.consentItems.join("\n"),
        country: /país admisible/,
        deceive: /engañar/,
        income: /Ningún ingreso garantizado/,
        withdraw: /Retiro en cualquier momento/,
      },
    ];
    for (const { items, country, deceive, income, withdraw } of locales) {
      assert.match(items, /18 ans|18 or older|18 años/);
      assert.match(items, country);
      assert.match(items, deceive);
      assert.match(items, /sexuels|sexual|sexuales/);
      assert.match(items, /politiques|political|políticos/);
      assert.match(items, income);
      assert.match(items, withdraw);
      assert.match(items, /PIPEDA|LPRPDE/);
      // A bracketed field remains open for Indiana's definitive text.
      assert.match(items, /\[[^\]]+]/);
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
