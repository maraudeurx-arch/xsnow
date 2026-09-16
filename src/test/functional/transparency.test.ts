import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { APP_VERSION } from "../../lib/app-version.ts";
import { en } from "../../lib/i18n/en.ts";
import { es } from "../../lib/i18n/es.ts";
import { fr } from "../../lib/i18n/fr.ts";
import {
  ABOUT_HREF,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  GITHUB_SECURITY_MD_URL,
  HOW_IT_WORKS_HREF,
  OPC_PUBLIC_EMAIL,
  OPC_PUBLIC_MAILTO,
  PRIVACY_HREF,
  PROOFS_HREF,
  SECURITY_HREF,
  TERMS_HREF,
  TRUST_NAV,
} from "../../lib/paths.ts";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "../../app");
const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function pageFile(href: string) {
  return join(appDir, href.replace(/^\//, ""), "page.tsx");
}

function versionNeedle(version: string) {
  return new RegExp(version.replaceAll(".", "\\."));
}

describe("transparency pages exist", () => {
  it("ships an App Router page for every public-trust footer link", () => {
    assert.deepEqual(
      TRUST_NAV.map((item) => item.href),
      [PRIVACY_HREF, TERMS_HREF, ABOUT_HREF, HOW_IT_WORKS_HREF, SECURITY_HREF, PROOFS_HREF],
    );
    for (const item of TRUST_NAV) {
      assert.equal(existsSync(pageFile(item.href)), true, item.href);
    }
    assert.equal(existsSync(pageFile("/mon-profil/a-propos")), true);
    assert.match(readFileSync(pageFile(ABOUT_HREF), "utf8"), /kind="about"/);
    assert.match(readFileSync(pageFile(HOW_IT_WORKS_HREF), "utf8"), /kind="how"/);
    assert.match(readFileSync(pageFile(SECURITY_HREF), "utf8"), /kind="security"/);
    assert.match(readFileSync(pageFile(PRIVACY_HREF), "utf8"), /kind="privacy"/);
    assert.match(readFileSync(pageFile(TERMS_HREF), "utf8"), /kind="terms"/);
    assert.match(readFileSync(pageFile(PROOFS_HREF), "utf8"), /kind="proofs"/);
  });
});

describe("transparency version and contact markers", () => {
  it("wires APP_VERSION into About copy and the version note component", () => {
    const needle = versionNeedle(APP_VERSION);
    assert.match(fr.profile.versionLabel, /Version/);
    assert.match(en.profile.versionLabel, /Version/);
    assert.match(es.profile.versionLabel, /Versión/);
    for (const pack of [fr, en, es]) {
      assert.match(pack.profile.releaseNotesBody, needle);
    }
    assert.match(fr.legal.about.sections[4].body, /version/i);
    assert.match(en.legal.about.sections[4].body, /app version/i);
    assert.match(es.legal.about.sections[4].body, /versión/i);

    const versionNote = readFileSync(join(srcDir, "components/AppVersionNote.tsx"), "utf8");
    assert.match(versionNote, /APP_VERSION/);
    assert.match(versionNote, /versionLabel/);
    const aboutUi = readFileSync(join(srcDir, "components/LocalizedLegal.tsx"), "utf8");
    assert.match(aboutUi, /AppVersionNote/);
    const profileAbout = readFileSync(join(srcDir, "components/LocalizedAbout.tsx"), "utf8");
    assert.match(profileAbout, /AppVersionNote/);
    assert.match(profileAbout, /InfosPrivacyNote/);
    assert.match(aboutUi, /InfosPrivacyNote/);
  });

  it("pins GitHub and the public OPC email through path constants", () => {
    assert.equal(OPC_PUBLIC_EMAIL, "opencommunity.opc@gmail.com");
    assert.equal(OPC_PUBLIC_MAILTO, `mailto:${OPC_PUBLIC_EMAIL}`);
    assert.equal(GITHUB_REPO_URL, "https://github.com/maraudeurx-arch/xsnow");
    assert.equal(GITHUB_ISSUES_URL, `${GITHUB_REPO_URL}/issues`);
    assert.match(GITHUB_SECURITY_MD_URL, /SECURITY\.md/);

    const email = new RegExp(OPC_PUBLIC_EMAIL.replaceAll(".", "\\."));
    for (const pack of [fr, en, es]) {
      assert.match(pack.legal.about.sections[3].body, email);
      assert.match(pack.legal.security.sections[3].body, email);
      assert.match(pack.legal.privacy.sections[0].body, email);
      assert.ok(pack.trust.emailLabel.length > 0);
      assert.match(pack.trust.github, /GitHub/);
      assert.match(pack.trust.issues, /GitHub Issues/);
    }

    const contact = readFileSync(join(srcDir, "components/TrustContact.tsx"), "utf8");
    assert.match(contact, /OPC_PUBLIC_EMAIL/);
    assert.match(contact, /OPC_PUBLIC_MAILTO/);
    assert.match(contact, /GITHUB_REPO_URL/);
    assert.match(contact, /GITHUB_ISSUES_URL/);

    const aboutMeta = readFileSync(pageFile(ABOUT_HREF), "utf8");
    assert.match(aboutMeta, email);
    const securityMeta = readFileSync(pageFile(SECURITY_HREF), "utf8");
    assert.match(securityMeta, email);
  });
});

describe("PWA manifest start URL", () => {
  it("uses root-relative start_url/scope so Next basePath is applied once", () => {
    const source = readFileSync(join(appDir, "manifest.ts"), "utf8");
    assert.match(source, /start_url: "\/"/);
    assert.match(source, /scope: "\/"/);
    assert.doesNotMatch(source, /start_url: `\$\{BASE_PATH\}/);
    assert.doesNotMatch(source, /src: `\$\{BASE_PATH\}/);
  });
});
