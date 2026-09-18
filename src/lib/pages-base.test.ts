import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CUSTOM_DOMAIN_HOST,
  PROJECT_PAGES_BASE,
  isCustomDomainCname,
  resolveDomainMode,
  resolvePagesBasePath,
  runtimePagesBasePath,
  useCustomDomainBasePath,
} from "./pages-base.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("pages basePath (custom domain vs project Pages)", () => {
  it("ships public/CNAME for GitHub Pages", () => {
    const cname = join(repoRoot, "public/CNAME");
    assert.equal(existsSync(cname), true);
    assert.equal(readFileSync(cname, "utf8").trim(), CUSTOM_DOMAIN_HOST);
  });

  it("treats CUSTOM_DOMAIN=1 as a root export and 0 as /xsnow", () => {
    assert.equal(resolveDomainMode({ CUSTOM_DOMAIN: "1" }), "custom");
    assert.equal(resolveDomainMode({ NEXT_PUBLIC_CUSTOM_DOMAIN: "true" }), "custom");
    assert.equal(resolveDomainMode({ CUSTOM_DOMAIN: "0" }), "project");
    assert.equal(resolveDomainMode({}), "auto");
    assert.equal(resolvePagesBasePath({ CUSTOM_DOMAIN: "1" }), "");
    assert.equal(resolvePagesBasePath({ CUSTOM_DOMAIN: "0" }, { cnamePresent: true }), PROJECT_PAGES_BASE);
    assert.equal(resolvePagesBasePath({}, { cnamePresent: true }), "");
    assert.equal(resolvePagesBasePath({}, { cnamePresent: false }), PROJECT_PAGES_BASE);
    assert.equal(useCustomDomainBasePath({ CUSTOM_DOMAIN: "1" }), true);
    assert.equal(isCustomDomainCname("opencommunity.app"), true);
    assert.equal(isCustomDomainCname("www.opencommunity.app"), true);
    assert.equal(isCustomDomainCname("maraudeurx-arch.github.io"), false);
  });
});

describe("runtimePagesBasePath", () => {
  it("forces empty base on opencommunity.app even if build path is /xsnow", () => {
    assert.equal(runtimePagesBasePath("opencommunity.app", PROJECT_PAGES_BASE), "");
    assert.equal(runtimePagesBasePath("www.opencommunity.app", PROJECT_PAGES_BASE), "");
  });

  it("keeps /xsnow on github.io project host", () => {
    assert.equal(runtimePagesBasePath("maraudeurx-arch.github.io", PROJECT_PAGES_BASE), PROJECT_PAGES_BASE);
  });
});
