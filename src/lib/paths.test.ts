import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ABOUT_HREF,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  HOW_IT_WORKS_HREF,
  isPublicInfoPath,
  OPC_PUBLIC_EMAIL,
  OPC_PUBLIC_MAILTO,
  PRIVACY_HREF,
  PROOFS_HREF,
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
