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

async function loadHuman(): Promise<HumanLike> {
  // Self-hosted browser ESM build (copied by scripts/copy-human-models.mjs), loaded only on demand.
  const url = `${window.location.origin}${basePath()}/models/human/human.esm.js`;
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as unknown as { Human: new (cfg: unknown) => HumanLike };
  const human = new mod.Human({
    modelBasePath: `${window.location.origin}${basePath()}/models/human/`,
    backend: "webgl",
    debug: false,
    face: {
      enabled: true,
      detector: { rotation: true, maxDetected: 1 },
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
  });
  await human.load();
  return human;
}

export function FaceScan({ idPhoto, onResult }: { idPhoto: string | null; onResult: (r: FaceCheck) => void }) {
  const { m } = useI18n();
  const t = m.arbitrage;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<"idle" | "left" | "right" | "done" | "unavailable">("idle");
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach((tr) => tr.stop()), []);

  const fail = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    setStep("unavailable");
    onResult({ score: null, liveness: false, method: "unavailable" });
  };

  async function start() {
    if (!idPhoto || !navigator.mediaDevices?.getUserMedia) return fail();
    try {
      const human = await loadHuman();
      const img = new Image();
      img.src = idPhoto;
      await img.decode();
      const idFace = (await human.detect(img)).face[0]?.embedding;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      let sawLeft = false;
      let sawRight = false;
      let best: number | null = null;
      setStep("left");
      const deadline = Date.now() + 60_000;
      while (Date.now() < deadline) {
        const face = (await human.detect(video)).face[0];
        const yaw = face?.rotation?.angle?.yaw ?? 0;
        if (face && yaw < -YAW_TURN) sawLeft = true;
        if (face && sawLeft && yaw > YAW_TURN) sawRight = true;
        setStep(sawLeft ? "right" : "left");
        if (face?.embedding && idFace && Math.abs(yaw) < YAW_FRONT) {
          const s = human.match.similarity(idFace, face.embedding);
          best = best === null ? s : Math.max(best, s);
        }
        if (sawLeft && sawRight && best !== null) break;
        await new Promise((r) => setTimeout(r, 120));
      }
      stream.getTracks().forEach((tr) => tr.stop());
      video.srcObject = null;
      const result: FaceCheck = {
        score: idFace ? best : null,
        liveness: sawLeft && sawRight,
        method: METHOD,
      };
      setScore(result.score);
      setStep(result.liveness && result.score !== null ? "done" : "unavailable");
      onResult(result);
    } catch {
      fail();
    }
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3" data-arb-face>
      <h3 className="text-base font-extrabold text-slate-900">{t.faceTitle}</h3>
      <video ref={videoRef} playsInline muted className={step === "left" || step === "right" ? "w-full rounded-xl" : "hidden"} />
      {step === "idle" ? (
        <button type="button" className="tap min-h-11 rounded-xl bg-slate-900 px-3 font-bold text-white disabled:opacity-50" disabled={!idPhoto} onClick={start}>
          {t.faceStart}
        </button>
      ) : null}
      {step === "left" ? <p className="font-bold text-slate-800">{t.faceTurnLeft}</p> : null}
      {step === "right" ? <p className="font-bold text-slate-800">{t.faceTurnRight}</p> : null}
      {step === "done" ? (
        <p className="text-sm text-slate-700">
          {t.faceDone} — {t.faceScore} : {Math.round((score ?? 0) * 100)} %. {t.facePending}
        </p>
      ) : null}
      {step === "unavailable" ? <p className="text-sm text-slate-700">{t.faceUnavailable}</p> : null}
    </section>
  );
}
