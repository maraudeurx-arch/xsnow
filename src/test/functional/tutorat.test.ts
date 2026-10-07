import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "../..");
const ROOT = join(SRC, "..");
const APP_DIR = join(SRC, "app");
const COMPONENTS_DIR = join(SRC, "components");
const TUTORAT_COMPONENTS_DIR = join(COMPONENTS_DIR, "tutorat");

// Any quoted or template link to the route: "/tutorat, '/tutorat or `/tutorat.
const LINKED_ROUTE = /["'`]\/tutorat/;

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

describe("tutorat route", () => {
  const page = join(APP_DIR, "tutorat", "page.tutorat.tsx");

  it("only exists behind the flagged page extension", () => {
    assert.equal(existsSync(page), true);
    assert.equal(existsSync(join(APP_DIR, "tutorat", "page.tsx")), false);
  });

  it("is wired to the build flag in next.config.ts", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    assert.match(config, /pageExtensions: tutoratPageExtensions\(process\.env\)/);
  });

  it("is noindex and nofollow", () => {
    const source = readFileSync(page, "utf8");
    assert.match(source, /index: false/);
    assert.match(source, /follow: false/);
  });
});

describe("tutorat is not linked", () => {
  it("is absent from shared components outside the tutorat folder", () => {
    const offenders = listFiles(COMPONENTS_DIR)
      .filter((file) => !file.startsWith(TUTORAT_COMPONENTS_DIR + sep))
      .filter((file) => LINKED_ROUTE.test(readFileSync(file, "utf8")));
    assert.deepEqual(offenders, []);
  });

  it("is absent from app routes and libs outside the tutorat folders", () => {
    const tutoratDirs = [join(APP_DIR, "tutorat") + sep, join(SRC, "lib", "tutorat") + sep, join(SRC, "test") + sep];
    const offenders = [...listFiles(APP_DIR), ...listFiles(join(SRC, "lib"))]
      .filter((file) => /\.(tsx?|mjs|js)$/.test(file))
      .filter((file) => !tutoratDirs.some((dir) => file.startsWith(dir)))
      .filter((file) => !file.endsWith(`${sep}tutorat.test.ts`))
      .filter((file) => LINKED_ROUTE.test(readFileSync(file, "utf8")));
    assert.deepEqual(offenders, []);
  });

  it("is absent from the paths helper when that file exists", () => {
    const pathsFile = join(SRC, "lib", "paths.ts");
    if (!existsSync(pathsFile)) return;
    assert.equal(LINKED_ROUTE.test(readFileSync(pathsFile, "utf8")), false);
  });
});

describe("tutorat sitemaps", () => {
  it("is absent from every existing sitemap", () => {
    const candidates = [join(APP_DIR, "sitemap.ts"), join(ROOT, "public", "sitemap.xml")];
    for (const file of candidates) {
      if (!existsSync(file)) continue;
      assert.equal(readFileSync(file, "utf8").toLowerCase().includes("tutorat"), false);
    }
  });
});

describe("tutorat preview", () => {
  it("stays inert: no raw HTML, no form, no link", () => {
    const source = readFileSync(
      join(TUTORAT_COMPONENTS_DIR, "TutoratPreview.tsx"),
      "utf8",
    );
    assert.equal(source.includes("dangerouslySetInnerHTML"), false);
    assert.equal(source.includes("<form"), false);
    assert.equal(source.includes("href="), false);
  });
});
