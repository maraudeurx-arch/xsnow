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
    assert.equal(existsSync(pageFile("/proprietaire/idees")), true);
    assert.match(readFileSync(pageFile("/proprietaire/idees"), "utf8"), /OwnerIdeasBoard/);
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
  it("embeds the absolute /xsnow/ URL so Home Screen does not open github.io root", () => {
    const source = readFileSync(join(appDir, "manifest.ts"), "utf8");
    assert.match(source, /pwaManifestLaunch/);
    assert.match(source, /start_url: launch\.start_url/);
    assert.match(source, /scope: launch\.scope/);
    assert.match(source, /id: launch\.id/);
    assert.match(source, /absoluteAssetUrl/);
    assert.doesNotMatch(source, /start_url: "\/"/);
    assert.doesNotMatch(source, /start_url: PWA_SCOPE/);
    const paths = readFileSync(join(srcDir, "lib/paths.ts"), "utf8");
    assert.match(paths, /PWA_START_URL = PUBLIC_SITE_URL/);
    assert.match(paths, /PUBLIC_SITE_ORIGIN = "https:\/\/maraudeurx-arch\.github\.io"/);
    const chrome = readFileSync(join(srcDir, "components/AppChrome.tsx"), "utf8");
    assert.match(chrome, /PagesScopeRedirect/);
    const notFound = readFileSync(join(appDir, "not-found.tsx"), "utf8");
    assert.match(notFound, /githubPagesHint/);
    assert.match(notFound, /PUBLIC_SITE_URL/);
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
    assert.match(installGuide, /data-install-url/);
    assert.match(installGuide, /PUBLIC_SITE_URL/);
    assert.match(installGuide, /wrongShortcut/);
    assert.match(installGuide, /data-install-wrong-shortcut/);
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

describe("Vos idées auto-emails Politzer without permission UX", () => {
  it("POSTs /ideas on submit with no mailto, share sheet, Notification, or confirm", () => {
    const ideas = readFileSync(join(srcDir, "components/features/IdeasBoard.tsx"), "utf8");
    assert.match(ideas, /postIdeaToInbox/);
    assert.match(ideas, /await sendInbox\(idea\)/);
    assert.doesNotMatch(ideas, /mailto:/);
    assert.doesNotMatch(ideas, /Notification/);
    assert.doesNotMatch(ideas, /navigator\.share/);
    assert.doesNotMatch(ideas, /window\.confirm|confirm\(/);
    assert.doesNotMatch(ideas, /retryInbox|Renvoyer au propriétaire/);

    const register = readFileSync(join(srcDir, "components/LocalProfileBoard.tsx"), "utf8");
    assert.match(register, /postRegisterNotice/);
    assert.doesNotMatch(register, /mailto:/);
    assert.doesNotMatch(register, /Notification/);
    assert.doesNotMatch(register, /navigator\.share/);
    assert.doesNotMatch(register, /window\.confirm|confirm\(/);
  });
});
