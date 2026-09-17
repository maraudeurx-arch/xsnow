"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  COACH_INTENT_IDS,
  COACH_PATH_HREF,
  COACH_TIME_IDS,
  coachComplete,
  nextCoachQuestion,
  rankCoachPaths,
  type CoachAnswers,
  type CoachTimeId,
} from "@/lib/coach";
import { useI18n } from "@/lib/i18n/locale";

export function AvatarCoach() {
  const { m } = useI18n();
  const copy = m.coach;
  const [answers, setAnswers] = useState<CoachAnswers>({});
  const question = nextCoachQuestion(answers);
  const paths = useMemo(() => rankCoachPaths(answers), [answers]);
  const done = coachComplete(answers);

  return (
    <div className="space-y-4" data-avatar-coach>
      <p className="text-sm leading-relaxed text-snow/90">{copy.lead}</p>
      <p
        className="rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold"
        data-coach-no-income
      >
        {copy.noIncome}
      </p>

      {question === "intent" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-extrabold text-snow">{copy.questions.intent}</legend>
          <div className="grid gap-2">
            {COACH_INTENT_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-coach-intent={id}
                className="tap min-h-11 rounded-2xl border border-white/15 bg-white/[0.05] px-3 text-left text-sm font-semibold text-snow"
                onClick={() => setAnswers((current) => ({ ...current, intent: id }))}
              >
                {copy.intents[id]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {question === "time" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-extrabold text-snow">{copy.questions.time}</legend>
          <div className="grid gap-2">
            {COACH_TIME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                data-coach-time={id}
                className="tap min-h-11 rounded-2xl border border-white/15 bg-white/[0.05] px-3 text-left text-sm font-semibold text-snow"
                onClick={() =>
                  setAnswers((current) => ({ ...current, time: id as CoachTimeId }))
                }
              >
                {copy.times[id]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {done ? (
        <div data-coach-paths className="space-y-2">
          <p className="text-sm font-extrabold text-snow">{copy.pathsTitle}</p>
          <ul className="grid gap-2">
            {paths.map((id) => (
              <li key={id}>
                <Link
                  href={COACH_PATH_HREF[id]}
                  data-coach-path={id}
                  className="tap flex min-h-11 flex-col justify-center rounded-2xl border border-cobalt/45 bg-cobalt/90 px-3 text-left text-sm font-extrabold text-snow"
                >
                  <span>{copy.paths[id].label}</span>
                  <span className="text-[11px] font-semibold text-snow/85">{copy.paths[id].hint}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-snug text-ice/80">{copy.pathsFoot}</p>
          <button
            type="button"
            className="text-xs font-semibold text-gold underline"
            onClick={() => setAnswers({})}
          >
            {copy.restart}
          </button>
        </div>
      ) : null}
    </div>
  );
}
