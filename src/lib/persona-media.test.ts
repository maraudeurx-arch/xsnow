import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadPersonaMedia,
  revokePreviewUrls,
  savePersonaMedia,
  setPersonaMediaStoreForTests,
  stopMediaStream,
} from "./persona-media.ts";

describe("monétise-toi — coupure des flux média (correctif Indiana, 07/11/2026)", () => {
  it("stops every track of the stream, so mic/camera indicators go off", () => {
    let stopped = 0;
    const stream = {
      getTracks: () => [
        { stop: () => { stopped += 1; } },
        { stop: () => { stopped += 1; } },
        { stop: () => { stopped += 1; } },
      ],
    };
    stopMediaStream(stream);
    assert.equal(stopped, 3);
  });

  it("tolerates null, undefined and broken streams without throwing", () => {
    assert.doesNotThrow(() => stopMediaStream(null));
    assert.doesNotThrow(() => stopMediaStream(undefined));
    assert.doesNotThrow(() =>
      stopMediaStream({
        getTracks: () => {
          throw new Error("broken");
        },
      }),
    );
  });

  it("one throwing track does not keep the other tracks alive", () => {
    let stopped = 0;
    const stream = {
      getTracks: () => [
        {
          stop: () => {
            throw new Error("stubborn track");
          },
        },
        { stop: () => { stopped += 1; } },
      ],
    };
    assert.doesNotThrow(() => stopMediaStream(stream));
    assert.equal(stopped, 1);
  });

  it("revoking preview URLs tolerates empty values and never throws", () => {
    assert.doesNotThrow(() => revokePreviewUrls([]));
    assert.doesNotThrow(() => revokePreviewUrls(["blob:fake-1", null, undefined, ""]));
  });
});

describe("monétise-toi — « consigné » seulement après écriture confirmée", () => {
  it("a confirmed write is what makes a file exist — save resolves true and the blob reads back", async () => {
    const store = new Map<string, Blob>();
    setPersonaMediaStoreForTests(store);
    const blob = new Blob(["photo"], { type: "image/jpeg" });
    const confirmed = await savePersonaMedia("persona-abc-1234", "image", blob);
    assert.equal(confirmed, true);
    const back = await loadPersonaMedia("persona-abc-1234", "image");
    assert.equal(back?.type, "image/jpeg");
    setPersonaMediaStoreForTests(null);
  });

  it("an unconfirmed write resolves false and nothing reads back as recorded", async () => {
    // No test store and no IndexedDB (Node): the write cannot be confirmed,
    // so the caller must NOT mark the file as recorded (« consigné »).
    setPersonaMediaStoreForTests(null);
    const blob = new Blob(["photo"], { type: "image/jpeg" });
    const confirmed = await savePersonaMedia("persona-abc-1234", "image", blob);
    assert.equal(confirmed, false);
    assert.equal(await loadPersonaMedia("persona-abc-1234", "image"), null);
  });
});
