"use client";

/**
 * In-browser face check with @vladmandic/human (MIT, open source).
 * Liveness: the user must turn the head left AND right (yaw), then a frontal frame
 * is compared to the face found on the ID photo. Nothing leaves the device: only
 * { score, liveness, method } is returned. Models are self-hosted under /models/human/.
 *
 * Honest limit: this is NOT a certified KYC / anti-spoofing check. A printed photo or
 * a replayed video can fool a head-turn challenge. The score is advisory and every
 * arbiter is reviewed by the owner before "verified".
 */

import { useEffect, useRef, useState } from "react";
import type { FaceCheck } from "@/lib/arbitrage";
import { useI18n } from "@/lib/i18n/locale";

type HumanLike = {
  load: () => Promise<void>;
  detect: (input: HTMLImageElement | HTMLVideoElement) => Promise<{
    face: { embedding?: number[]; rotation?: { angle?: { yaw?: number } } | null }[];
  }>;
  match: { similarity: (a: number[], b: number[]) => number };
};

const METHOD = "human-3.3/faceres+yaw-liveness";
const YAW_TURN = 0.35;
const YAW_FRONT = 0.15;

function basePath() {
  if (typeof window === "undefined") return "";
  const next = (window as unknown as { __NEXT_DATA__?: { basePath?: string } }).__NEXT_DATA__;
  return next?.basePath ?? "";
}

let humanPromise: Promise<HumanLike> | null = null;

function humanConfig(backend: "webgl" | "wasm" | "humangl") {
  return {
    modelBasePath: `${window.location.origin}${basePath()}/models/human/`,
    backend,
    debug: false,
    face: {
      enabled: true,
      detector: { rotation: true, maxDetected: 1, minConfidence: 0.3 },
      mesh: { enabled: true },
      iris: { enabled: false },
      description: { enabled: true },
      emotion: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
  };
}

async function loadHuman(): Promise<HumanLike> {
  // Self-hosted browser ESM build (copied by scripts/copy-human-models.mjs), loaded once, on demand.
  if (!humanPromise) {
    humanPromise = (async () => {
      const url = `${window.location.origin}${basePath()}/models/human/human.esm.js`;
      const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as unknown as { Human: new (cfg: unknown) => HumanLike };
      // "humangl" is Human's WebGL backend tuned for iOS Safari; fall back to plain webgl.
      for (const backend of ["humangl", "webgl"] as const) {
        try {
          const human = new mod.Human(humanConfig(backend));
          await human.load();
          return human;
        } catch { /* try next backend */ }
      }
      throw new Error("backend");
    })();
    humanPromise.catch(() => { humanPromise = null; });
  }
  return humanPromise;
}

type Step = "idle" | "loading" | "scan" | "done" | "error";
type ErrKey = "faceDenied" | "faceNoCamera" | "faceNoIdFace" | "faceTimeout" | "faceError" | "faceUnavailable";

function cameraError(e: unknown): ErrKey | null {
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError") return "faceDenied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError" || name === "AbortError") return "faceNoCamera";
  return null;
}

async function waitForFrames(video: HTMLVideoElement) {
  if (video.readyState >= 2 && video.videoWidth > 0) return;
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("video-timeout")), 10_000);
    const ok = () => { if (video.videoWidth > 0) { clearTimeout(to); resolve(); } };
    video.addEventListener("loadeddata", ok, { once: true });
    video.addEventListener("loadedmetadata", ok, { once: true });
  });
}

export function FaceScan({ idPhoto, onResult }: { idPhoto: string | null; onResult: (r: FaceCheck) => void }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aliveRef = useRef(true);
  const [step, setStep] = useState<Step>("idle");
  const [side, setSide] = useState<"left" | "right">("left");
  const [noFace, setNoFace] = useState(false);
  const [err, setErr] = useState<ErrKey | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; stop(); };
  }, []);

  const fail = (key: ErrKey) => {
    stop();
    if (!aliveRef.current) return;
    setErr(key);
    setStep("error");
    onResult({ score: null, liveness: false, method: "unavailable" });
  };

  async function start() {
    if (!idPhoto) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return fail("faceNoCamera");
    setErr(null);
    setNoFace(false);
    setSide("left");
    setStep("loading");
    // Ask for the camera first, inside the tap gesture (iOS), before the slow model download.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      return fail(cameraError(e) ?? "faceNoCamera");
    }
    streamRef.current = stream;
    try {
      const video = videoRef.current!;
      video.muted = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      await waitForFrames(video);

      const human = await loadHuman();
      const img = new Image();
      img.src = idPhoto;
      await img.decode();
      const idFace = (await human.detect(img)).face[0]?.embedding;
      if (!idFace) return fail("faceNoIdFace");
      if (!aliveRef.current) return stop();
      setStep("scan");

      // Order-independent: the front camera is mirrored, so "left" for the user may be either
      // sign of yaw. We need one clear turn to each side plus one frontal match.
      let sawNeg = false;
      let sawPos = false;
      let best: number | null = null;
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline && aliveRef.current) {
        const face = (await human.detect(video)).face[0];
        setNoFace(!face);
        if (face) {
          const yaw = face.rotation?.angle?.yaw ?? 0;
          if (yaw < -YAW_TURN) sawNeg = true;
          if (yaw > YAW_TURN) sawPos = true;
          if (face.embedding && face.embedding.length && Math.abs(yaw) < YAW_FRONT) {
            const s = human.match.similarity(idFace, face.embedding);
            best = best === null ? s : Math.max(best, s);
          }
        }
        setSide(sawNeg || sawPos ? "right" : "left");
        if (sawNeg && sawPos && best !== null) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      stop();
      if (!aliveRef.current) return;
      const liveness = sawNeg && sawPos;
      if (!liveness || best === null) return fail("faceTimeout");
      const result: FaceCheck = { score: best, liveness, method: METHOD };
      setScore(best);
      setStep("done");
      onResult(result);
    } catch (e) {
      fail(cameraError(e) ?? "faceError");
    }
  }

  const scanning = step === "loading" || step === "scan";
  return (
    <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3" data-arb-face>
      <h3 className="text-base font-extrabold text-slate-900">{t.faceTitle}</h3>
      {/* Kept in layout (not display:none) while scanning: iOS Safari won't decode frames of a hidden video. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        data-arb-face-video
        className={scanning ? "aspect-[4/3] w-full -scale-x-100 rounded-xl bg-black object-cover" : "pointer-events-none absolute h-px w-px opacity-0"}
      />
      {step === "idle" || step === "error" ? (
        <button type="button" className="tap min-h-11 rounded-xl bg-slate-900 px-3 font-bold text-white disabled:opacity-50" disabled={!idPhoto} onClick={start} data-arb-face-start>
          {step === "error" ? t.faceRetry : t.faceStart}
        </button>
      ) : null}
      {step === "loading" ? <p className="text-sm font-bold text-slate-800" aria-live="polite">{t.faceLoading}</p> : null}
      {step === "scan" ? (
        <p className="font-bold text-slate-800" aria-live="polite">
          {noFace ? t.faceNoFace : side === "left" ? t.faceTurnLeft : t.faceTurnRight}
        </p>
      ) : null}
      {step === "done" ? (
        <p className="text-sm text-slate-700">
          {t.faceDone} — {t.faceScore} : {Math.round((score ?? 0) * 100)} %. {t.facePending}
        </p>
      ) : null}
      {step === "error" && err ? (
        <p className="text-sm text-slate-700" role="alert" data-arb-face-error={err}>
          {t[err]} {err !== "faceUnavailable" ? t.faceUnavailable : null}
        </p>
      ) : null}
    </section>
  );
}
