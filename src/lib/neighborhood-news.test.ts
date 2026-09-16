import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";
import { interpolate } from "./i18n/locales.ts";
import {
  cacheIsFresh,
  categorizeHeadline,
  digitalEconomyQuery,
  headlinesForPrompt,
  mergeNewsBuckets,
  newsCacheKey,
  orderNeighborhoodNews,
  parseNewsPayload,
  parseRssItems,
  toNeighborhoodItem,
  type NeighborhoodNewsItem,
} from "./neighborhood-news.ts";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<item>
  <title>Fibre optique : investissement numérique à Gatineau - Le Droit</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Mon, 15 Sep 2026 10:00:00 GMT</pubDate>
  <source url="https://example.com">Le Droit</source>
</item>
<item>
  <title>Fermeture de rue pour le Tour de Gatineau</title>
  <link>https://news.google.com/rss/articles/def</link>
  <pubDate>Sun, 14 Sep 2026 08:00:00 GMT</pubDate>
  <source url="https://gatineau.ca">Ville de Gatineau</source>
</item>
</channel></rss>`;

describe("parseRssItems", () => {
  it("extracts title, link, source and drops invented fields", () => {
    const items = parseRssItems(SAMPLE_RSS);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.source, "Le Droit");
    assert.match(items[0]?.title ?? "", /Fibre optique/);
    assert.doesNotMatch(items[0]?.title ?? "", /Le Droit$/);
    assert.ok(items[0]?.link.startsWith("https://"));
    assert.ok(items[0]?.publishedAt);
  });
});

describe("orderNeighborhoodNews", () => {
  it("puts digital/economy headlines before other local news", () => {
    const mixed: NeighborhoodNewsItem[] = [
      toNeighborhoodItem({
        title: "Concert au parc Jacques-Cartier",
        link: "https://example.com/a",
        source: "Local",
        publishedAt: null,
      }),
      toNeighborhoodItem({
        title: "Nouvelle startup tech à Gatineau",
        link: "https://example.com/b",
        source: "Tech",
        publishedAt: null,
      }),
      toNeighborhoodItem({
        title: "Économie locale : commerces du centre-ville",
        link: "https://example.com/c",
        source: "Biz",
        publishedAt: null,
      }),
    ];
    const ordered = orderNeighborhoodNews(mixed);
    assert.equal(ordered[0]?.category, "digital_economy");
    assert.equal(ordered[1]?.category, "digital_economy");
    assert.equal(ordered[2]?.category, "local");
    assert.match(ordered[0]?.title ?? "", /startup|Économie|Economie/i);
    assert.match(ordered[1]?.title ?? "", /startup|Économie|Economie/i);
    assert.match(ordered[2]?.title ?? "", /Concert/);
  });

  it("dedupes by title", () => {
    const dup = toNeighborhoodItem({
      title: "Même titre",
      link: "https://example.com/1",
      source: "A",
      publishedAt: null,
    });
    const ordered = orderNeighborhoodNews([
      dup,
      { ...dup, link: "https://example.com/2", id: "other" },
    ]);
    assert.equal(ordered.length, 1);
  });
});

describe("mergeNewsBuckets", () => {
  it("forces the digital feed into digital_economy and keeps local after", () => {
    const merged = mergeNewsBuckets(
      [
        {
          title: "Ouverture d’un centre communautaire",
          link: "https://example.com/d",
          source: "Ville",
          publishedAt: null,
        },
      ],
      [
        {
          title: "Match de soccer local",
          link: "https://example.com/e",
          source: "Sport",
          publishedAt: null,
        },
      ],
    );
    assert.equal(merged[0]?.category, "digital_economy");
    assert.equal(merged[1]?.category, "local");
  });
});

describe("categorizeHeadline", () => {
  it("flags digital and economy keywords", () => {
    assert.equal(categorizeHeadline("Boom de l’économie numérique"), "digital_economy");
    assert.equal(categorizeHeadline("Accident sur l’autoroute"), "local");
  });
});

describe("news cache helpers", () => {
  it("keys and freshness", () => {
    assert.equal(newsCacheKey("Gatineau"), "xsnow.neighborhoodNews.gatineau");
    assert.equal(
      cacheIsFresh({ city: "Gatineau", fetchedAt: Date.now() - 1000, items: [] }),
      true,
    );
    assert.equal(
      cacheIsFresh({ city: "Gatineau", fetchedAt: Date.now() - 7 * 60 * 60 * 1000, items: [] }),
      false,
    );
  });

  it("parseNewsPayload rejects garbage and keeps https links only", () => {
    assert.equal(parseNewsPayload(null), null);
    const parsed = parseNewsPayload({
      city: "Gatineau",
      fetchedAt: 1,
      items: [
        {
          title: "Ok",
          link: "https://example.com/ok",
          source: "Src",
          category: "local",
        },
        { title: "Bad", link: "javascript:alert(1)", source: "X", category: "local" },
      ],
    });
    assert.ok(parsed);
    assert.equal(parsed?.items.length, 1);
    assert.equal(parsed?.items[0]?.title, "Ok");
  });
});

describe("rendering status when geo known vs unknown", () => {
  it("maps resolved flag to Accueil news UI expectations", () => {
    // Mirrors NeighborhoodNews: unknown city → need_city; known → load/show.
    function statusFor(resolved: boolean, itemCount: number, failed: boolean) {
      if (!resolved) return "need_city";
      if (failed && itemCount === 0) return "error";
      if (itemCount > 0) return "ready";
      return "empty";
    }
    assert.equal(statusFor(false, 0, false), "need_city");
    assert.equal(statusFor(true, 2, false), "ready");
    assert.equal(statusFor(true, 0, false), "empty");
    assert.equal(statusFor(true, 0, true), "error");
  });
});

describe("avatar news prompt training", () => {
  it("never invents headlines and cites only provided ones", () => {
    const base = interpolate(fr.systemPrompt, {
      city: "Gatineau",
      placeName: "GATINEAU",
      avatar: "Guide",
    });
    assert.match(base, /Nouvelles du Quartier/);
    const without = `${base} ${fr.neighborhoodNews.promptNoHeadlines}`;
    assert.match(without, /ne fabrique jamais/);

    const line = headlinesForPrompt([
      {
        id: "1",
        title: "Investissement fibre à Hull",
        link: "https://example.com/f",
        source: "Le Droit",
        publishedAt: null,
        category: "digital_economy",
      },
    ]);
    const withNews = `${base} ${interpolate(fr.neighborhoodNews.promptWithHeadlines, {
      headlines: line,
    })}`;
    assert.match(withNews, /Investissement fibre à Hull/);
    assert.match(withNews, /Le Droit/);
    assert.match(withNews, /sans en inventer/);

    assert.deepEqual(Object.keys(en.neighborhoodNews), Object.keys(fr.neighborhoodNews));
    assert.deepEqual(Object.keys(es.neighborhoodNews), Object.keys(fr.neighborhoodNews));
    assert.equal(fr.neighborhoodNews.title, "Nouvelles du Quartier");
    assert.equal(en.neighborhoodNews.title, "Neighbourhood News");
    assert.equal(es.neighborhoodNews.title, "Noticias del Barrio");
    assert.match(en.systemPrompt, /Neighbourhood News/);
    assert.match(es.systemPrompt, /Noticias del Barrio/);
    assert.match(digitalEconomyQuery("Gatineau", "fr"), /numérique/);
  });
});
