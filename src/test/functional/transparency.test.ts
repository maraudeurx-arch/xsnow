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
  BASE_PATH,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  GITHUB_SECURITY_MD_URL,
  HOW_IT_WORKS_HREF,
  OPC_PUBLIC_EMAIL,
  OPC_PUBLIC_MAILTO,
  PRIVACY_HREF,
  PROOFS_HREF,
  PWA_SCOPE,
  SECURITY_HREF,
  TERMS_HREF,
  TRUST_NAV,
} from "../../lib/paths.ts";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "../../app");
const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = join(srcDir, "..");

function assertHomeScreenLaunch(
  data: {
    start_url?: string;
    scope?: string;
    id?: string;
    icons?: { src?: string }[];
  },
  label: string,
) {
  assert.equal(data.start_url, PWA_SCOPE, `${label} start_url`);
  assert.equal(data.scope, PWA_SCOPE, `${label} scope`);
  assert.equal(data.id, PWA_SCOPE, `${label} id`);
  assert.notEqual(data.start_url, "/");
  assert.notEqual(data.start_url, "https://maraudeurx-arch.github.io/");
  assert.doesNotMatch(String(data.start_url), /\/xsnow\/xsnow/);
  for (const icon of data.icons ?? []) {
    assert.match(String(icon.src), new RegExp(`^${BASE_PATH}/`), `${label} icon ${icon.src}`);
    assert.doesNotMatch(String(icon.src), /\/xsnow\/xsnow/);
  }
}

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
  it("launches /xsnow/ in the manifest source and the built Pages artifact", () => {
    assert.equal(PWA_SCOPE, "/xsnow/");
    assert.equal(PWA_SCOPE, `${BASE_PATH}/`);
    assert.notEqual(PWA_SCOPE, "/");

    const source = readFileSync(join(appDir, "manifest.ts"), "utf8");
    assert.match(source, /start_url: PWA_SCOPE/);
    assert.match(source, /scope: PWA_SCOPE/);
    assert.match(source, /id: PWA_SCOPE/);
    assert.match(source, /src: assetUrl\("\/brand\/app-icon-/);
    assert.doesNotMatch(source, /start_url: "\/"/);
    assert.doesNotMatch(source, /id: "\/"/);

    const built = join(repoRoot, "out/manifest.webmanifest");
    if (existsSync(built)) {
      const json = JSON.parse(readFileSync(built, "utf8")) as {
        start_url?: string;
        scope?: string;
        id?: string;
        icons?: { src?: string }[];
      };
      assertHomeScreenLaunch(json, "out/manifest.webmanifest");
    }

    const layout = readFileSync(join(appDir, "layout.tsx"), "utf8");
    assert.match(layout, /assetUrl\("\/apple-touch-icon\.png"\)/);
    assert.doesNotMatch(layout, /url: "\/apple-touch-icon/);

    const htmlPath = join(repoRoot, "out/index.html");
    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, "utf8");
      assert.match(html, /href="\/xsnow\/manifest\.webmanifest"/);
      assert.match(html, /href="\/xsnow\/apple-touch-icon\.png"/);
      assert.doesNotMatch(html, /href="\/manifest\.webmanifest"/);
      assert.doesNotMatch(html, /href="\/apple-touch-icon\.png"/);
    }
  });
});

describe("Mon profil hub dedupes Accueil actions", () => {
  it("drops Mes infos / Partager / body Connect and keeps privacy on À propos only", () => {
    const profilMenu = readFileSync(join(srcDir, "components/ProfilMenu.tsx"), "utf8");
    assert.doesNotMatch(profilMenu, /mon-profil\/infos/);
    assert.match(profilMenu, /mon-profil\/reglages/);
    assert.match(profilMenu, /mon-profil\/a-propos/);
    assert.match(profilMenu, /InstallGuide/);

    const installGuide = readFileSync(join(srcDir, "components/InstallGuide.tsx"), "utf8");
    assert.match(installGuide, /data-install-guide/);
    assert.match(installGuide, /profileTitle/);
    assert.match(installGuide, /iphoneSteps/);
    assert.match(installGuide, /tipAndroid/);
    assert.doesNotMatch(installGuide, /shouldShowInstallTip/);
    assert.doesNotMatch(installGuide, /writeInstallTipDismissed/);

    const board = readFileSync(join(srcDir, "components/LocalProfileBoard.tsx"), "utf8");
    assert.doesNotMatch(board, /data-share-cta/);
    assert.doesNotMatch(board, /data-share-panel/);
    assert.doesNotMatch(board, /infosPrivacy/);
    assert.doesNotMatch(board, /data-infos-privacy/);

    const infosPage = readFileSync(pageFile("/mon-profil/infos"), "utf8");
    assert.doesNotMatch(infosPage, /ConnectWallet/);
    assert.doesNotMatch(infosPage, /InfosPrivacyNote/);
    assert.doesNotMatch(infosPage, /LocalProfileBoard/);
    assert.match(infosPage, /router\.replace\("\/mon-profil\/"\)/);

    const profileAbout = readFileSync(join(srcDir, "components/LocalizedAbout.tsx"), "utf8");
    assert.match(profileAbout, /InfosPrivacyNote/);
    const aboutUi = readFileSync(join(srcDir, "components/LocalizedLegal.tsx"), "utf8");
    assert.match(aboutUi, /InfosPrivacyNote/);
  });
});
