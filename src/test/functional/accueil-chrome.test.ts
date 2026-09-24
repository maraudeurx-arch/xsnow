import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(srcDir, rel), "utf8");
}

describe("Accueil chrome: cobalt, green slogans, ring pills, Parchemin glass", () => {
  const css = read("app/globals.css");

  it("paints the Accueil wordmark and logo cobalt and leaves other pages alone", () => {
    assert.match(css, /\.app-stage:has\(#home-guide\) > \.brand-banner h1 \{\s*color: var\(--cobalt\);/);
    assert.match(css, /hue-rotate\(205deg\)/);
    assert.doesNotMatch(css, /color: #000000;/);
    assert.doesNotMatch(css, /\.logo-rock \{\s*filter: brightness\(0\);/);
  });

  it("colors Accueil header and footer slogans with the green --gold token", () => {
    assert.match(css, /\.app-stage:has\(#home-guide\) > \.brand-banner p \{\s*color: var\(--gold\);/);
    assert.match(css, /\.safe-frame:has\(#home-guide\) \.footer-slogan-line \{\s*color: var\(--gold\);/);
    assert.match(css, /--gold: #22c55e;/);
    assert.match(css, /animation: footer-slogan-slide 36s linear infinite;/);
  });

  it("outlines inactive Accueil nav chips with the chosen avatar ring", () => {
    const nav = read("components/HeaderNav.tsx");
    const menu = read("components/AccueilMenu.tsx");
    const connect = read("components/ConnectWallet.tsx");
    assert.match(nav, /useStoredAvatar/);
    assert.match(nav, /AVATAR_RINGS\[avatarById\(avatarId\)\.ring\]/);
    assert.match(nav, /"--avatar-ring": ring/);
    assert.match(nav, /data-header-nav/);
    assert.match(menu, /header-nav-chip/);
    assert.match(connect, /header-nav-chip/);
    assert.match(css, /\.app-stage:has\(#home-guide\) \.header-nav-chip:not\(\[aria-current="page"\]\) \{\s*border-color: var\(--avatar-ring, var\(--cobalt\)\);/);
    assert.match(css, /min-height:\s*2\.3rem;/);
    assert.match(css, /font-size:\s*0\.68rem;/);
    assert.match(css, /white-space:\s*normal;/);
    assert.match(css, /box-sizing:\s*border-box;/);
    assert.match(css, /--home-nav-h: 2\.3rem;/);
  });

  it("frosts only Accueil surface blocks in Parchemin", () => {
    const start = css.indexOf("Accueil surfaces: Parchemin frosted glass");
    const end = css.indexOf("Accueil header nav pills");
    assert.ok(start > 0 && end > start);
    const glass = css.slice(start, end);
    assert.match(glass, /rgba\(245, 242, 235, 0\.72\)/);
    assert.match(glass, /backdrop-filter: blur\(16px\);/);
    assert.doesNotMatch(glass, /-webkit-backdrop-filter:/);
    assert.match(glass, /\.chrome-panel/);
    assert.match(glass, /\.home-stage/);
    assert.match(glass, /\.opc-glass,/);
    assert.match(glass, /\.opc-glass-menu/);
    assert.match(glass, /\.app-stage:has\(#home-guide\) #avatar-chat/);
    assert.match(glass, /\.safe-frame:has\(#home-guide\) > footer/);
    assert.doesNotMatch(glass, /opc-glass-soft/);
    assert.match(css, /--home-chip-h: 1\.375rem;/);
  });
});
