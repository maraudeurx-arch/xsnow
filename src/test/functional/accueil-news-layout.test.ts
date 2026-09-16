import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return readFileSync(join(srcDir, rel), "utf8");
}

describe("Accueil Nouvelles layout fills toward the footer", () => {
  it("uses a 3-row grid so leftover height lands in the green news card", () => {
    const guide = read("components/Guide.tsx");
    const css = read("app/globals.css");
    const news = read("components/NeighborhoodNews.tsx");

    assert.match(guide, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/);
    assert.match(guide, /gagner-maintenant/);
    assert.match(guide, /vos-idees/);
    assert.match(guide, /ShareHomeButton/);
    assert.match(guide, /AvatarChat/);
    assert.match(
      css,
      /home-stage:has\(\[data-neighborhood-news\]\)[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto/,
    );
    assert.match(news, /data-neighborhood-news/);
    assert.match(news, /min-h-0 flex-1 grow flex-col gap-1 self-stretch/);
    assert.match(news, /sm:min-h-\[22rem\]/);
    assert.match(news, /data-news-list[\s\S]*min-h-0[\s\S]*flex-1 grow/);
    assert.match(news, /data-news-spacer[\s\S]*min-h-0[\s\S]*flex-1 grow/);
    assert.match(css, /\[data-news-list\][\s\S]*flex:\s*1 1 0%/);
    assert.match(css, /min-height:\s*max\(22rem,\s*48dvh\)/);
    assert.match(css, /min-height:\s*max\(14rem,\s*28dvh\)/);
    assert.match(css, /min-height:\s*max\(25rem,\s*55dvh\)/);
    // Specific grid-child floors must not be zeroed (would beat media queries).
    assert.doesNotMatch(
      css,
      /home-stage:has\(\[data-neighborhood-news\]\) > \[data-neighborhood-news\] \{[^}]*min-height:\s*0;/,
    );
    assert.match(
      css,
      /home-stage:has\(\[data-neighborhood-news\]\) > \[data-neighborhood-news\] \{[^}]*min-height:\s*max\(22rem,\s*48dvh\)/,
    );
    assert.doesNotMatch(css, /0\.42fr/);
    assert.doesNotMatch(news, /lorem ipsum/i);
    assert.doesNotMatch(news, /fake headline/i);
  });

  it("keeps chat and footer outside the news flex-grow so they are not crushed", () => {
    const guide = read("components/Guide.tsx");
    const chat = read("components/AvatarChat.tsx");
    const footer = read("components/SiteFooter.tsx");
    const css = read("app/globals.css");

    assert.match(guide, /flex shrink-0 flex-col/);
    assert.match(chat, /id="avatar-chat"/);
    assert.match(chat, /shrink-0/);
    assert.match(footer, /<footer/);
    assert.match(footer, /LegalLinks/);
    assert.match(
      css,
      /max-height:\s*660px[\s\S]*\[data-neighborhood-news\][\s\S]*min-height:\s*max\(15rem,\s*38dvh\)/,
    );
  });
});
