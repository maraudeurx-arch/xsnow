import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pickRecorderMimeType,
  transcribeAudio,
  transcribeEndpoint,
  transcribeLanguageParam,
  TranscribeError,
} from "./transcribe.ts";

function fakeFetch(response: Response | Error, captured?: { url?: string; init?: RequestInit }) {
  return (async (url: unknown, init?: RequestInit) => {
    if (captured) {
      captured.url = String(url);
      captured.init = init;
    }
    if (response instanceof Error) throw response;
    return response;
  }) as never;
}

describe("dictée fiable — client /transcribe", () => {
  it("builds the endpoint from the ideas inbox base, like /register", () => {
    assert.equal(
      transcribeEndpoint("https://xsnow-chat.xsnowopc.workers.dev"),
      "https://xsnow-chat.xsnowopc.workers.dev/transcribe",
    );
    assert.match(transcribeEndpoint(), /\/transcribe$/);
  });

  it("reduces the interface locale to a two-letter Whisper hint", () => {
    assert.equal(transcribeLanguageParam("fr-CA"), "fr");
    assert.equal(transcribeLanguageParam("en"), "en");
    assert.equal(transcribeLanguageParam("es-ES"), "es");
    assert.equal(transcribeLanguageParam(""), "");
    assert.equal(transcribeLanguageParam("auto"), "");
  });

  it("picks the first MediaRecorder container the browser supports", () => {
    assert.equal(pickRecorderMimeType(() => true), "audio/mp4");
    assert.equal(
      pickRecorderMimeType((mime) => mime.startsWith("audio/webm")),
      "audio/webm;codecs=opus",
    );
    assert.equal(pickRecorderMimeType(() => false), undefined);
  });

  it("posts the raw audio with its type and the language, returns the trimmed text", async () => {
    const captured: { url?: string; init?: RequestInit } = {};
    const text = await transcribeAudio(
      new Blob(["fake-audio"], { type: "audio/mp4" }),
      "fr-CA",
      fakeFetch(new Response(JSON.stringify({ text: "  Mon idée dictée. " }), { status: 200 }), captured),
    );
    assert.equal(text, "Mon idée dictée.");
    assert.equal(captured.url, "https://xsnow-chat.xsnowopc.workers.dev/transcribe?lang=fr");
    assert.equal(captured.init?.method, "POST");
    assert.equal((captured.init?.headers as Record<string, string>)["Content-Type"], "audio/mp4");
    assert.ok(captured.init?.body instanceof Blob);
  });

  it("maps failures to typed errors: server refusal, empty transcript, network down", async () => {
    await assert.rejects(
      transcribeAudio(new Blob(["x"], { type: "audio/mp4" }), "fr", fakeFetch(new Response("{}", { status: 500 }))),
      (error: unknown) => error instanceof TranscribeError && error.kind === "server",
    );
    await assert.rejects(
      transcribeAudio(
        new Blob(["x"], { type: "audio/mp4" }),
        "fr",
        fakeFetch(new Response(JSON.stringify({ text: "  " }), { status: 200 })),
      ),
      (error: unknown) => error instanceof TranscribeError && error.kind === "empty",
    );
    await assert.rejects(
      transcribeAudio(new Blob(["x"], { type: "audio/mp4" }), "fr", fakeFetch(new TypeError("offline"))),
      (error: unknown) => error instanceof TranscribeError && error.kind === "network",
    );
  });
});
