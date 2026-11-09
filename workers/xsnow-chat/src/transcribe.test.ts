import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  audioBytesToBase64,
  handleTranscribePost,
  isAudioContentType,
  isTranscribePath,
  parseTranscribeLanguage,
  TRANSCRIBE_MAX_AUDIO_BYTES,
  TRANSCRIBE_MODEL,
  type TranscribeRun,
} from "./transcribe.ts";

const env = { AI: { run: async () => ({}) } };
const silentAudio = new Uint8Array([1, 2, 3, 4]);

function okRun(captured: { model?: string; inputs?: Record<string, unknown> }): TranscribeRun {
  return async (model, inputs) => {
    captured.model = model;
    captured.inputs = inputs;
    return { text: "  Une idée dictée à voix haute.  " };
  };
}

describe("worker — route /transcribe", () => {
  it("reconnaît le chemin, avec ou sans préfixe", () => {
    assert.equal(isTranscribePath("/transcribe"), true);
    assert.equal(isTranscribePath("/transcribe/"), true);
    assert.equal(isTranscribePath("/quelque-part/transcribe"), true);
    assert.equal(isTranscribePath("/ideas"), false);
    assert.equal(isTranscribePath("/transcription"), false);
  });

  it("n'accepte que les types audio, paramètres compris", () => {
    assert.equal(isAudioContentType("audio/mp4"), true);
    assert.equal(isAudioContentType("audio/webm;codecs=opus"), true);
    assert.equal(isAudioContentType("audio/ogg"), true);
    assert.equal(isAudioContentType(" AUDIO/WEBM "), true);
    assert.equal(isAudioContentType("application/json"), false);
    assert.equal(isAudioContentType("video/webm"), false);
    assert.equal(isAudioContentType(""), false);
    assert.equal(isAudioContentType(null), false);
  });

  it("réduit la langue d'interface au code Whisper, sinon détection automatique", () => {
    assert.equal(parseTranscribeLanguage("fr-CA"), "fr");
    assert.equal(parseTranscribeLanguage("fr"), "fr");
    assert.equal(parseTranscribeLanguage("en-US"), "en");
    assert.equal(parseTranscribeLanguage("es"), "es");
    assert.equal(parseTranscribeLanguage("auto"), undefined);
    assert.equal(parseTranscribeLanguage(""), undefined);
    assert.equal(parseTranscribeLanguage(null), undefined);
  });

  it("transcrit : audio en base64 vers Whisper, texte nettoyé en retour", async () => {
    const captured: { model?: string; inputs?: Record<string, unknown> } = {};
    const result = await handleTranscribePost(
      { audio: silentAudio, contentType: "audio/mp4", language: "fr-CA" },
      env,
      okRun(captured),
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, { text: "Une idée dictée à voix haute." });
    assert.equal(captured.model, TRANSCRIBE_MODEL);
    assert.equal(captured.inputs?.audio, audioBytesToBase64(silentAudio));
    assert.equal(captured.inputs?.language, "fr");
  });

  it("sans langue exploitable, aucun paramètre de langue n'est envoyé (détection auto)", async () => {
    const captured: { model?: string; inputs?: Record<string, unknown> } = {};
    const result = await handleTranscribePost(
      { audio: silentAudio, contentType: "audio/webm;codecs=opus", language: null },
      env,
      okRun(captured),
    );
    assert.equal(result.status, 200);
    assert.ok(captured.inputs && !("language" in captured.inputs));
  });

  it("refuse proprement : vide, trop gros, non audio — sans appeler le modèle", async () => {
    let calls = 0;
    const run: TranscribeRun = async () => {
      calls += 1;
      return { text: "x" };
    };
    const empty = await handleTranscribePost(
      { audio: new Uint8Array(0), contentType: "audio/mp4", language: "fr" },
      env,
      run,
    );
    assert.deepEqual(empty, { status: 400, data: { error: "empty_audio" } });
    const big = await handleTranscribePost(
      { audio: new Uint8Array(TRANSCRIBE_MAX_AUDIO_BYTES + 1), contentType: "audio/mp4", language: "fr" },
      env,
      run,
    );
    assert.deepEqual(big, { status: 400, data: { error: "payload_too_large" } });
    const json = await handleTranscribePost(
      { audio: silentAudio, contentType: "application/json", language: "fr" },
      env,
      run,
    );
    assert.deepEqual(json, { status: 400, data: { error: "unsupported_media_type" } });
    assert.equal(calls, 0);
  });

  it("un échec du modèle devient un 500 propre, jamais un plantage", async () => {
    const run: TranscribeRun = async () => {
      throw new Error("ai down");
    };
    const result = await handleTranscribePost(
      { audio: silentAudio, contentType: "audio/mp4", language: "fr" },
      env,
      run,
    );
    assert.deepEqual(result, { status: 500, data: { error: "transcription_failed" } });
  });

  it("un modèle qui ne renvoie pas de texte donne un texte vide, pas une erreur", async () => {
    const run: TranscribeRun = async () => ({ vtt: "..." });
    const result = await handleTranscribePost(
      { audio: silentAudio, contentType: "audio/mp4", language: "fr" },
      env,
      run,
    );
    assert.deepEqual(result, { status: 200, data: { text: "" } });
  });
});
