import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const app = join(root, "app");

function page(rel: string) {
  return join(app, rel, "page.tsx");
}

/** Only offer / request a service requires signup. Exploration stays open. */
const MUST_GATE = ["mes-services", "en-demande"];

const MUST_STAY_OPEN = [
  "vie-privee",
  "conditions",
  "about",
  "comment-ca-marche",
  "securite",
  "preuves-de-revenus",
  "mon-profil",
  "business",
  "services",
  "proximite",
  "telephone",
  "alertes",
  "monetise",
  "sondages",
  "vos-idees",
  "gagner-maintenant",
  "mon-profil/inviter",
  "reportage",
  "scenarios",
  "series",
  "dessins-animes",
  "attributs",
];

describe("SignupGate coverage", () => {
  it("requires registration only to offer or request a service", () => {
    for (const rel of MUST_GATE) {
      const file = page(rel);
      assert.equal(existsSync(file), true, rel);
      const src = readFileSync(file, "utf8");
      assert.match(src, /SignupGate/, `${rel} must wrap SignupGate`);
    }
  });

  it("lets visitors explore other surfaces without SignupGate", () => {
    for (const rel of MUST_STAY_OPEN) {
      const file = page(rel);
      assert.equal(existsSync(file), true, rel);
      const src = readFileSync(file, "utf8");
      assert.doesNotMatch(src, /SignupGate/, `${rel} must stay open`);
    }
    const home = join(app, "page.tsx");
    assert.doesNotMatch(readFileSync(home, "utf8"), /SignupGate/);
    const kind = join(app, "services/[kind]/page.tsx");
    assert.doesNotMatch(readFileSync(kind, "utf8"), /SignupGate/);
  });
});
