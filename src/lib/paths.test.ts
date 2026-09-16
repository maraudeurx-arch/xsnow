import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABOUT_HREF,
  absoluteAssetUrl,
  BASE_PATH,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  HOW_IT_WORKS_HREF,
  isGithubPagesProjectHost,
  isOutsideAppScope,
  isPublicInfoPath,
  needsGithubPagesScopeRedirect,
  OPC_PUBLIC_EMAIL,
  OPC_PUBLIC_MAILTO,
  PRIVACY_HREF,
  PROOFS_HREF,
  PUBLIC_SITE_ORIGIN,
  PUBLIC_SITE_URL,
  PWA_SCOPE,
  PWA_START_URL,
  pwaManifestLaunch,
  SECURITY_HREF,
  TERMS_HREF,
  TRUST_NAV,
} from "./paths.ts";

describe("public trust paths", () => {
  it("lists privacy, terms, and transparency routes", () => {
    assert.deepEqual(
      TRUST_NAV.map((item) => item.href),
      [PRIVACY_HREF, TERMS_HREF, ABOUT_HREF, HOW_IT_WORKS_HREF, SECURITY_HREF, PROOFS_HREF],
    );
    assert.equal(ABOUT_HREF, "/about");
    assert.equal(HOW_IT_WORKS_HREF, "/comment-ca-marche");
    assert.equal(SECURITY_HREF, "/securite");
    assert.equal(PROOFS_HREF, "/preuves-de-revenus");
    assert.equal(GITHUB_REPO_URL, "https://github.com/maraudeurx-arch/xsnow");
    assert.equal(GITHUB_ISSUES_URL, "https://github.com/maraudeurx-arch/xsnow/issues");
    assert.equal(OPC_PUBLIC_EMAIL, "opencommunity.opc@gmail.com");
    assert.equal(OPC_PUBLIC_MAILTO, "mailto:opencommunity.opc@gmail.com");
    assert.doesNotMatch(OPC_PUBLIC_EMAIL, /icloud/i);
  });

  it("keeps the PWA Home Screen URL under /xsnow/, not github.io root", () => {
    assert.equal(BASE_PATH, "/xsnow");
    assert.equal(PWA_SCOPE, "/xsnow/");
    assert.equal(PWA_SCOPE.startsWith(BASE_PATH), true);
    assert.notEqual(PWA_SCOPE, "/");
    assert.equal(PUBLIC_SITE_ORIGIN, "https://maraudeurx-arch.github.io");
    assert.equal(PUBLIC_SITE_URL, "https://maraudeurx-arch.github.io/xsnow/");
    assert.equal(PWA_START_URL, PUBLIC_SITE_URL);
    assert.equal(PWA_START_URL.endsWith("/xsnow/"), true);
    assert.notEqual(PWA_START_URL, "/");
    assert.notEqual(PWA_START_URL, PUBLIC_SITE_ORIGIN);
    assert.notEqual(PWA_START_URL, `${PUBLIC_SITE_ORIGIN}/`);

    const launch = pwaManifestLaunch();
    assert.equal(launch.start_url, PWA_START_URL);
    assert.equal(launch.scope, PWA_START_URL);
    assert.equal(launch.id, PWA_START_URL);
    assert.equal(launch.start_url.includes("/xsnow/"), true);
    assert.equal(launch.start_url.startsWith("https://"), true);
    assert.doesNotMatch(launch.start_url, /\/xsnow\/xsnow/);
    assert.equal(
      absoluteAssetUrl("/brand/app-icon-192.png"),
      "https://maraudeurx-arch.github.io/xsnow/brand/app-icon-192.png",
    );
  });

  it("redirects github.io org-root shortcuts onto /xsnow/", () => {
    assert.equal(isGithubPagesProjectHost("maraudeurx-arch.github.io"), true);
    assert.equal(isGithubPagesProjectHost("localhost"), false);
    assert.equal(isGithubPagesProjectHost("example.com"), false);
    assert.equal(isOutsideAppScope("/"), true);
    assert.equal(isOutsideAppScope("/index.html"), true);
    assert.equal(isOutsideAppScope("/xsnow"), false);
    assert.equal(isOutsideAppScope("/xsnow/"), false);
    assert.equal(isOutsideAppScope("/xsnow/mon-profil/"), false);
    assert.equal(
      needsGithubPagesScopeRedirect({
        hostname: "maraudeurx-arch.github.io",
        pathname: "/",
      }),
      true,
    );
    assert.equal(
      needsGithubPagesScopeRedirect({
        hostname: "maraudeurx-arch.github.io",
        pathname: "/xsnow/",
      }),
      false,
    );
    assert.equal(
      needsGithubPagesScopeRedirect({
        hostname: "localhost",
        pathname: "/",
      }),
      false,
    );
  });

  it("treats trust pages as readable without the consent sheet", () => {
    assert.equal(isPublicInfoPath("/about/"), true);
    assert.equal(isPublicInfoPath("/comment-ca-marche"), true);
    assert.equal(isPublicInfoPath("/securite/"), true);
    assert.equal(isPublicInfoPath("/preuves-de-revenus"), true);
    assert.equal(isPublicInfoPath("/vie-privee"), true);
    assert.equal(isPublicInfoPath("/conditions"), true);
    assert.equal(isPublicInfoPath("/mon-profil/a-propos"), true);
    assert.equal(isPublicInfoPath("/"), false);
    assert.equal(isPublicInfoPath("/mon-profil"), false);
  });
});
