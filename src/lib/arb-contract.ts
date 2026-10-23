/**
 * OPC arbiter agreement (Popol, 23/10/2026): 7th checklist step « J'accepte le contrat d'arbitre OPC ».
 * v1.0 in force (Popol's go 23/10 + Knicks review). Lawyer review later, when funded.
 * The server stores acceptance timestamp + version + SHA-256 of the exact accepted text.
 */
export { ARB_CONTRACT_TEXT } from "./arb-contract-text.ts";
export const ARB_CONTRACT_VERSION = "1.0";
export const ARB_CONTRACT_SHA256 = "ed5194728feaf0a58376f74fe099339b7da72a341c3d1de17daa066f36dccaeb";

/** Accepted the CURRENT version (a new version requires a new acceptance). */
export function contractAccepted(hash: string | null | undefined): boolean {
  return hash === ARB_CONTRACT_SHA256;
}
