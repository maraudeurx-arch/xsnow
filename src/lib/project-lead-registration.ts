/**
 * « Chef de projet » — S'enregistrer (Popol, 02/11/2026): the same official onboarding as arbiters
 * (identity papers + browser face check, same Worker routes and storage, same privacy rules),
 * with one difference: "read the Manuel de justice" becomes "read the Project Lead instructions"
 * (PDF + mandatory, timestamped "I have read and accept" box).
 * No crypto, no wallet, no token, no amount anywhere in this flow.
 * Framework-free: shared by the browser and the Worker (workers/xsnow-chat/src/arbitrage.ts).
 */
import { faceCheckDone } from "./arb-checklist.ts";

export const APPLICANT_ROLES = ["arbiter", "project_lead"] as const;
export type ApplicantRole = (typeof APPLICANT_ROLES)[number];

export function parseApplicantRole(raw: unknown): ApplicantRole {
  return raw === "project_lead" ? "project_lead" : "arbiter";
}

/** Bump when the Project Lead conditions modal changes. */
export const PROJECT_LEAD_TERMS_VERSION = "2026-11-02.pl1";
/** Bump when the instructions PDFs change (the acceptance records this version). */
export const PROJECT_LEAD_INSTRUCTIONS_VERSION = "2026-11-02.v1";

/** Public assets (served from /public, prefix with assetUrl in the browser). */
export const PROJECT_LEAD_INSTRUCTIONS_PDF = {
  fr: "/chef-de-projet/instructions-chef-de-projet_FR.pdf",
  en: "/chef-de-projet/instructions-project-lead_EN.pdf",
} as const;

/** Spanish has no PDF yet: English first, French offered as well. */
export function instructionsPdfFor(locale: string): string {
  return locale === "fr" ? PROJECT_LEAD_INSTRUCTIONS_PDF.fr : PROJECT_LEAD_INSTRUCTIONS_PDF.en;
}

/** The registration path, in order (the first four happen before the request is sent). */
export const PROJECT_LEAD_STEPS = ["terms", "identity", "face", "email", "notifications", "instructions", "approval"] as const;
export type ProjectLeadStepId = (typeof PROJECT_LEAD_STEPS)[number];

export type ProjectLeadChecklistInput = {
  status: string;
  termsVersion: string | null;
  hasIdentity: boolean;
  hasEmail: boolean;
  pushSubscriptions: number;
  faceScore: number | null;
  faceLiveness: boolean;
  faceReviewed: boolean;
  rescanRequested?: boolean;
  instructionsReadAt: number | null;
  instructionsVersion: string | null;
};

export type ProjectLeadChecklist = {
  items: { id: ProjectLeadStepId; done: boolean }[];
  doneCount: number;
  total: number;
  complete: boolean;
  instructionsReadAt: string | null;
};

export function instructionsAccepted(readAt: number | null, version: string | null): boolean {
  return typeof readAt === "number" && readAt > 0 && version === PROJECT_LEAD_INSTRUCTIONS_VERSION;
}

export function computeProjectLeadChecklist(i: ProjectLeadChecklistInput): ProjectLeadChecklist {
  const done: Record<ProjectLeadStepId, boolean> = {
    terms: i.termsVersion === PROJECT_LEAD_TERMS_VERSION,
    identity: i.hasIdentity || i.status === "verified",
    face: faceCheckDone(i),
    email: i.hasEmail,
    notifications: i.pushSubscriptions > 0,
    instructions: instructionsAccepted(i.instructionsReadAt, i.instructionsVersion),
    approval: i.status === "verified",
  };
  const items = PROJECT_LEAD_STEPS.map((id) => ({ id, done: done[id] }));
  const doneCount = items.filter((x) => x.done).length;
  return {
    items, doneCount, total: items.length, complete: doneCount === items.length,
    instructionsReadAt: done.instructions ? new Date(i.instructionsReadAt as number).toISOString() : null,
  };
}

/** The project lead's token stays on this device, apart from an arbiter token. */
export const PROJECT_LEAD_TOKEN_KEY = "opc.projectLead.token.v1";
