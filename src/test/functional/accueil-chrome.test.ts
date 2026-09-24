import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(srcDir, rel), "utf8");
}

describe("Accueil chrome: cobalt mark, green header slogan, Parchemin glass", () => {
  const css = read("app/globals.css");

  it("paints the Accueil wordmark and logo cobalt and leaves other pages alone", () => {
    assert.match(css, /\.app-stage:has\(#home-guide\) > \.brand-banner h1 \{\s*color: var\(--cobalt\);/);
    assert.match(css, /hue-rotate\(205deg\)/);
    assert.doesNotMatch(css, /color: #000000;/);
    assert.doesNotMatch(css, /\.logo-rock \{\s*filter: brightness\(0\);/);
  });

  it("colors the Accueil header slogan green and the footer marquee cobalt", () => {
    assert.match(css, /\.app-stage:has\(#home-guide\) > \.brand-banner p \{\s*color: var\(--gold\);/);
    assert.match(
      css,
      /\.footer-slogan-line \{\s*font-size: var\(--brand-slogan\);\s*color: var\(--cobalt\);/,
    );
    assert.doesNotMatch(css, /\.footer-slogan-line[^{]*\{[^}]*color:\s*var\(--gold\)/);
    assert.match(css, /--gold: #22c55e;/);
    assert.match(css, /--cobalt: #006efd;/);
    assert.match(css, /animation: footer-slogan-slide 36s linear infinite;/);
  });

  it("fills nav chips and Accueil shortcuts with solid cobalt and white text", () => {
    const nav = read("components/HeaderNav.tsx");
    const menu = read("components/AccueilMenu.tsx");
    const connect = read("components/ConnectWallet.tsx");
    const guide = read("components/Guide.tsx");
    const place = read("components/HeaderPlaceWithAvatar.tsx");
    assert.match(nav, /useStoredAvatar/);
    assert.match(nav, /data-header-nav/);
    assert.match(menu, /header-nav-chip/);
    assert.match(connect, /header-nav-chip/);
    assert.match(guide, /home-shortcut/);
    assert.match(place, /text-gold/);
    assert.doesNotMatch(place, /text-slate-900/);
    assert.match(css, /\.header-nav-chip,\s*\n\.home-shortcut \{\s*background: var\(--cobalt\);\s*color: #ffffff;/);
    assert.match(css, /\.header-nav-chip\[aria-current="page"\] \{\s*background: #0054c8;/);
    assert.match(css, /\.app-stage:has\(#home-guide\) \.header-nav-chip \{\s*[^}]*background: var\(--cobalt\);\s*color: #ffffff;/);
    assert.match(css, /min-height:\s*2\.3rem;/);
    assert.match(css, /font-size:\s*0\.68rem;/);
    assert.match(css, /white-space:\s*normal;/);
    assert.match(css, /box-sizing:\s*border-box;/);
    assert.match(css, /--home-nav-h: 2\.3rem;/);
    assert.doesNotMatch(css, /border-color: var\(--avatar-ring, var\(--cobalt\)\)/);
  });

  it("frosts chrome shells in Parchemin on every page", () => {
    const start = css.indexOf("Shared chrome shells: Parchemin frosted glass");
    const end = css.indexOf("Filled primary actions stay white-on-blue");
    assert.ok(start > 0 && end > start);
    const glass = css.slice(start, end);
    assert.doesNotMatch(glass, /#home-guide/);
    assert.match(glass, /rgba\(245, 242, 235, 0\.72\)/);
    assert.match(glass, /backdrop-filter: blur\(16px\);/);
    assert.doesNotMatch(glass, /-webkit-backdrop-filter:/);
    assert.match(glass, /\.chrome-panel/);
    assert.match(glass, /\.home-stage/);
    assert.match(glass, /\.opc-glass,/);
    assert.match(glass, /\.opc-glass-menu/);
    assert.match(glass, /footer\.opc-glass-soft/);
    assert.match(glass, /\.chrome-shell/);
    assert.doesNotMatch(glass, /\n\.opc-glass-soft/);
    assert.doesNotMatch(glass, /#avatar-chat/);
    assert.match(css, /\.opc-glass-soft,\s*\n\.opc-glass-menu \{\s*[^}]*background:\s*#ffffff;/);
    assert.doesNotMatch(css, /#avatar-chat[^{]*\{[^}]*rgba\(245,\s*242,\s*235/);
    assert.match(css, /--home-chip-h: 1\.375rem;/);
  });
});

describe("Look A classic chrome from pre-look-moderne-0.3.5", () => {
  const classic = read("app/look-classic.css");
  const layout = read("app/layout.tsx");

  it("scopes the 0.3.5 tokens, dark glass, and cobalt pills to data-opc-look=a", () => {
    assert.match(classic, /pre-look-moderne-0\.3\.5/);
    assert.match(classic, /f817873a4795/);
    assert.match(classic, /html\[data-opc-look="a"\] \{\s*[^}]*--gold: #3dff8a;/);
    assert.match(classic, /--cobalt: #2563eb;/);
    assert.match(classic, /rgba\(36, 22, 14, 0\.72\)/);
    assert.match(classic, /rgba\(40, 24, 14, 0\.74\)/);
    assert.match(classic, /font-size: 9px;/);
    assert.match(classic, /border-radius: 0\.5rem;/);
    assert.match(classic, /color: var\(--gold\);/);
    assert.match(layout, /opc-look\.js/);
    assert.match(layout, /beforeInteractive/);
    assert.match(layout, /--font-classic-outfit/);
    assert.match(layout, /look-classic\.css/);
  });

  it("keeps 0.4.0 copy and features for both looks", () => {
    const fr = read("lib/i18n/fr.ts");
    const guide = read("components/Guide.tsx");
    const look = read("lib/opc-look.ts");
    assert.match(fr, /gagnerMaintenant: "Gagner maintenant"/);
    assert.match(fr, /introTitle: "Open Community \(OPC\) c’est :"/);
    assert.match(fr, /introDisclaimer: "Aucune garantie de revenu\."/);
    assert.match(guide, /m\.guide\.introTitle/);
    assert.match(guide, /m\.guide\.introDisclaimer/);
    assert.match(guide, /m\.menu\.gagnerMaintenant/);
    assert.doesNotMatch(guide, /opcLook|data-opc-look/);
    assert.doesNotMatch(classic, /content\s*:/);
    assert.match(look, /A\/B is look-only/);
  });
});
