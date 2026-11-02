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
