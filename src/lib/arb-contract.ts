/**
 * OPC arbiter agreement (Popol, 23/10/2026): 7th checklist step « J'accepte le contrat d'arbitre OPC ».
 * v1.0 in force (Popol's go 23/10 + Knicks review). v1.1 (25/10): art. 13.2 names who appoints the dispute arbitrator (Knicks).
 * Lawyer review later, when funded.
 * The server stores acceptance timestamp + version + SHA-256 of the exact accepted text.
 */
export { ARB_CONTRACT_TEXT } from "./arb-contract-text.ts";
export const ARB_CONTRACT_VERSION = "1.1";
export const ARB_CONTRACT_SHA256 = "409b21412526209c156116bf10fb7bca2f47d8eb47c3c67eb9b17855eba3f099";

/** Accepted the CURRENT version (a new version requires a new acceptance). */
export function contractAccepted(hash: string | null | undefined): boolean {
  return hash === ARB_CONTRACT_SHA256;
}

/**
 * Grace period (art. 14: 15-day notice). Until ARB_CONTRACT_EFFECTIVE_AT + ARB_CONTRACT_GRACE_DAYS, an arbiter
 * who has not accepted the CURRENT version (accepted v1.0, or nothing yet) keeps receiving new real Dossiers,
 * while their space asks them gently to accept. After that, the block applies: no new real Dossiers until
 * the current version is accepted. Simulations are never blocked (training).
 * Set ARB_CONTRACT_EFFECTIVE to the day the notice is given / v1.1 goes live; the Worker can override it
 * with the ARB_CONTRACT_EFFECTIVE env var (ISO date) without a code change.
 */
export const ARB_CONTRACT_EFFECTIVE = "2026-10-26T00:00:00-04:00";
export const ARB_CONTRACT_EFFECTIVE_AT = Date.parse(ARB_CONTRACT_EFFECTIVE);
export const ARB_CONTRACT_GRACE_DAYS = 15;
const DAY_MS = 86_400_000;

/** SHA-256 of earlier versions (v1.0 of 23/10/2026). Used to tell "new version" from "never accepted". */
export const ARB_CONTRACT_PREVIOUS_SHA256: readonly string[] = [
  "ed5194728feaf0a58376f74fe099339b7da72a341c3d1de17daa066f36dccaeb",
];

export type ContractState =
  | { state: "current" }
  | { state: "grace"; daysLeft: number; graceEndsAt: number; previousVersion: boolean }
  | { state: "required"; previousVersion: boolean };

/** Effective date in ms: ISO override (Worker env) or the constant when missing / invalid. */
export function contractEffectiveAt(override?: string | null): number {
  const t = override ? Date.parse(override) : NaN;
  return Number.isFinite(t) ? t : ARB_CONTRACT_EFFECTIVE_AT;
}

export function contractState(hash: string | null | undefined, nowMs: number, effectiveAt: number = ARB_CONTRACT_EFFECTIVE_AT): ContractState {
  if (contractAccepted(hash)) return { state: "current" };
  const previousVersion = !!hash && ARB_CONTRACT_PREVIOUS_SHA256.includes(hash);
  const graceEndsAt = effectiveAt + ARB_CONTRACT_GRACE_DAYS * DAY_MS;
  if (nowMs < graceEndsAt) {
    const daysLeft = Math.min(ARB_CONTRACT_GRACE_DAYS, Math.max(1, Math.ceil((graceEndsAt - Math.max(nowMs, effectiveAt)) / DAY_MS)));
    return { state: "grace", daysLeft, graceEndsAt, previousVersion };
  }
  return { state: "required", previousVersion };
}

/** New real (non-simulated) Dossiers: current version accepted, or still inside the grace period. */
export function canReceiveRealCases(hash: string | null | undefined, nowMs: number, effectiveAt: number = ARB_CONTRACT_EFFECTIVE_AT): boolean {
  return contractState(hash, nowMs, effectiveAt).state !== "required";
}
