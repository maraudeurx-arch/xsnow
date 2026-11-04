"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useModalViewport } from "@/lib/useModalViewport";
import { SignupGate } from "@/components/SignupGate";
import { ProjectLeadRegistration } from "@/components/features/ProjectLeadRegistration";
import { postIdeaToInbox, type IdeaInboxPostResult } from "@/lib/idea-inbox";
import { useI18n } from "@/lib/i18n/locale";
import { usePlace } from "@/lib/place";
import { useLocalProfile } from "@/lib/useLocalProfile";
import {
  emptyProjectLeadForm,
  projectLeadInboxText,
  projectLeadIssues,
  type ProjectLeadForm,
} from "@/lib/project-lead";

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/30 bg-white/90 px-3 text-[15px] text-slate-900";
const buttonClass =
  "tap inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-3.5 text-[15px] font-bold text-slate-900";

export function ProjectLeadDialog({ onClose }: { onClose: () => void }) {
  const { m } = useI18n();
  const g = m.earnNow.projectLead;
  const { city } = usePlace();
  const [profile] = useLocalProfile();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [form, setForm] = useState<ProjectLeadForm>(emptyProjectLeadForm());
  const [state, setState] = useState<"idle" | "invalid" | "sending" | IdeaInboxPostResult>("idle");

  const boxRef = useRef<HTMLElement | null>(null);
  const viewport = useModalViewport();

  useEffect(() => {
    // Always reopen on the title + intro: focusing « Fermer » (bottom) used to scroll the sheet
    // down, so the second « S'enregistrer » showed only the fields (Popol, 04/11/2026).
    boxRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "sending") return;
    if (projectLeadIssues(form).length) {
      setState("invalid");
      return;
    }
    setState("sending");
    // Same inbox as Vos idées: tagged text + city + OPC id only, never phone or e-mail.
    const result = await postIdeaToInbox({
      id: `lead-${Date.now().toString(36)}`,
      text: projectLeadInboxText(form),
      city: city || "",
      opcId: profile?.id || "",
    });
    setState(result);
  }

  const patch = (key: keyof ProjectLeadForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (typeof document === "undefined") return null;
  // Portal to <body>: inside .app-stage (z-20) the sheet sat under the footer slogan banner.
  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[90] flex items-end justify-center bg-black/60 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center"
      style={{ top: viewport.top, height: viewport.height }}
      onClick={onClose}
      data-project-lead-overlay
    >
      <section
        ref={boxRef}
        className="opc-glass-menu max-h-full w-full overscroll-contain max-w-md overflow-y-auto rounded-2xl p-4 text-left text-snow"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-project-lead-dialog
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-[16px] font-extrabold tracking-wide">{g.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-snow/90">{g.lead}</p>
        <h3 className="mt-3 text-[14px] font-bold">{g.doesTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-snow/90">
          {g.doesList.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <h3 className="mt-3 text-[14px] font-bold">{g.neverTitle}</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] text-snow/90" data-project-lead-never>
          {g.neverList.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="mt-3 text-[13px] italic text-snow/90" data-project-lead-pay>{g.payNote}</p>

        <div className="mt-4">
          <ProjectLeadRegistration />
        </div>

        <h3 className="mt-4 text-[14px] font-bold">{g.formTitle}</h3>
        <div className="mt-2">
          <SignupGate>
            {state === "sent" ? (
              <p className="text-[13px]" data-project-lead-sent>{g.sent}</p>
            ) : (
              <form className="grid gap-2" onSubmit={onSubmit} data-project-lead-form>
                <label className="grid gap-1 text-[13px]">{g.country}
                  <input className={inputClass} value={form.country} maxLength={60} onChange={(e) => patch("country", e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px]">{g.languages}
                  <input className={inputClass} value={form.languages} maxLength={80} onChange={(e) => patch("languages", e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px]">{g.hours}
                  <input className={inputClass} inputMode="numeric" value={form.hours} maxLength={20} onChange={(e) => patch("hours", e.target.value)} />
                </label>
                <label className="grid gap-1 text-[13px]">{g.motivation}
                  <textarea className={`${inputClass} min-h-20 py-2`} value={form.motivation} maxLength={300} onChange={(e) => patch("motivation", e.target.value)} />
                </label>
                <label className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={form.adult} onChange={(e) => patch("adult", e.target.checked)} /> {g.adult}
                </label>
                <label className="flex items-start gap-2 text-[13px]">
                  <input type="checkbox" checked={form.confidentiality} onChange={(e) => patch("confidentiality", e.target.checked)} /> {g.confidentiality}
                </label>
                {state === "invalid" ? <p role="alert" className="text-[13px]">{g.invalid}</p> : null}
                {state === "failed" ? <p role="alert" className="text-[13px]">{g.failed}</p> : null}
                <button type="submit" className={buttonClass} disabled={state === "sending"}>
                  {state === "sending" ? g.sending : g.submit}
                </button>
              </form>
            )}
          </SignupGate>
        </div>
        <button ref={closeRef} type="button" className={`${buttonClass} mt-3`} onClick={onClose} data-project-lead-close>
          {g.close}
        </button>
      </section>
    </div>,
    document.body,
  );
}
