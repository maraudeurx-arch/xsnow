// Generates the 4 HITL arbitration secrets into a mode-600 file OUTSIDE the repo.
// Never prints secret values. Usage: node scripts/arbitrage-keys.mjs [outFile]
import { webcrypto as c } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const out = resolve(process.argv[2] || `${homedir()}/.config/opc-arbitrage/keys.env`);
if (out.startsWith(process.cwd())) throw new Error("refusing to write secrets inside the repo");
if (existsSync(out)) { console.log(`exists, not overwritten: ${out}`); process.exit(0); }
const b64 = (u8) => Buffer.from(u8).toString("base64");
const kp = await c.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const lines = [
  `ARBITER_ENC_KEY=${b64(c.getRandomValues(new Uint8Array(32)))}`,
  `ARBITER_SIGNING_KEY=${b64(new Uint8Array(await c.subtle.exportKey("pkcs8", kp.privateKey)))}`,
  `ARBITER_SIGNING_PUBLIC_KEY=${b64(new Uint8Array(await c.subtle.exportKey("spki", kp.publicKey)))}`,
  `ARBITER_ADMIN_SECRET=${Buffer.from(c.getRandomValues(new Uint8Array(32))).toString("base64url")}`,
];
mkdirSync(dirname(out), { recursive: true, mode: 0o700 });
writeFileSync(out, lines.join("\n") + "\n", { mode: 0o600 });
chmodSync(out, 0o600);
console.log(`wrote 4 secrets (mode 600) to ${out}`);
