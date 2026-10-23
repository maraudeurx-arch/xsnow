/**
 * OPC arbiter agreement (Popol, 23/10/2026): 7th checklist step « J'accepte le contrat d'arbitre OPC ».
 * DRAFT v0.1 — to be reviewed by a lawyer; not live without Popol's go.
 * The server stores acceptance timestamp + version + SHA-256 of the exact accepted text.
 */
export { ARB_CONTRACT_TEXT } from "./arb-contract-text.ts";
export const ARB_CONTRACT_VERSION = "0.1";
export const ARB_CONTRACT_SHA256 = "7b79fa27e87fa81f15ac0b547e58e1899457b1718671bacaa85fae88546ce328";

/** Accepted the CURRENT version (a new version requires a new acceptance). */
export function contractAccepted(hash: string | null | undefined): boolean {
  return hash === ARB_CONTRACT_SHA256;
}
