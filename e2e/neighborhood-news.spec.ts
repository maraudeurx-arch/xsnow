import { expect, test, type Page } from "./helpers";

const SAMPLE_NEWS = {
  city: "Gatineau",
  fetchedAt: 1_779_000_000_000,
  items: [
    {
      id: "digital:fibre:https://example.com/fibre",
      title: "Fibre optique à Hull",
      link: "https://example.com/fibre",
      source: "Le Droit",
      publishedAt: "2026-09-16T12:00:00.000Z",
      category: "digital_economy",
    },
    {
      id: "local:tour:https://example.com/tour",
      title: "Tour de Gatineau dimanche",
      link: "https://example.com/tour",
      source: "Ville de Gatineau",
      publishedAt: "2026-09-15T12:00:00.000Z",
      category: "local",
    },
  ],
};

async function seedReturningVisitor(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
    window.localStorage.setItem("xsnow.geoConsent", JSON.stringify("skipped"));
    window.localStorage.setItem("xsnow.analyticsConsent", JSON.stringify("denied"));
  });
}

test.describe("Accueil neighbourhood news + partner slots", () => {
  test("fills the Accueil card toward the footer with headlines and labeled ads", async ({
    page,
  }) => {
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SAMPLE_NEWS),
      });
    });

    await page.goto("./?city=Gatineau");

    const news = page.locator("[data-neighborhood-news]");
    await expect(news).toHaveAttribute("data-news-status", "ready");
    await expect(page.getByText("Fibre optique à Hull")).toBeVisible();
    await expect(page.getByText("Tour de Gatineau dimanche")).toBeVisible();
    const fibreBox = await page.getByText("Fibre optique à Hull").boundingBox();
    expect(fibreBox?.height ?? 0).toBeGreaterThan(12);
    await expect(page.locator("[data-partner-slot]")).toHaveCount(2);
    await expect(page.getByText("Espace partenaire").first()).toBeVisible();
    await expect(page.getByText("Commandité").first()).toBeVisible();
    await expect(page.getByText(/ferme à clics/).first()).toBeVisible();
    await expect(page.getByText(/Grok et Cursor/).first()).toBeVisible();

    const title = page.getByRole("heading", { name: "Open Community", level: 1 });
    const chrome = page.locator(".chrome-panel").first();
    const card = page.locator("#home-guide .home-stage");
    const footer = page.locator("footer");
    const titleBox = await title.boundingBox();
    const chromeBox = await chrome.boundingBox();
    const cardBox = await card.boundingBox();
    const footerBox = await footer.boundingBox();
    const newsBox = await news.boundingBox();
    const chatBox = await page.locator("#avatar-chat").boundingBox();
    expect(titleBox).toBeTruthy();
    expect(chromeBox).toBeTruthy();
    expect(cardBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(newsBox).toBeTruthy();
    expect(chatBox).toBeTruthy();

    expect(titleBox!.y).toBeLessThan(36);

    const headerToCard = cardBox!.y - (chromeBox!.y + chromeBox!.height);
    expect(headerToCard).toBeGreaterThanOrEqual(0);
    expect(headerToCard).toBeLessThan(16);

    const gap = footerBox!.y - (cardBox!.y + cardBox!.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(24);
    expect(newsBox!.height).toBeGreaterThan(chatBox!.height);
    expect(newsBox!.height).toBeGreaterThan(160);
    expect(footerBox!.height).toBeLessThan(64);
  });

  test("need-city Accueil still stacks tight with a tall news inventory and partner slots", async ({
    page,
  }) => {
    await seedReturningVisitor(page);
    await page.goto("./");

    const news = page.locator("[data-neighborhood-news]");
    await expect(news).toHaveAttribute("data-news-status", "need_city");
    await expect(page.getByText(/Dès que ta ville est connue/)).toBeVisible();
    await expect(page.locator("[data-partner-slot]")).toHaveCount(2);
    await expect(page.getByText("Commandité").first()).toBeVisible();

    const titleBox = await page.getByRole("heading", { name: "Open Community", level: 1 }).boundingBox();
    const chromeBox = await page.locator(".chrome-panel").first().boundingBox();
    const cardBox = await page.locator("#home-guide .home-stage").boundingBox();
    const footerBox = await page.locator("footer").boundingBox();
    const newsBox = await news.boundingBox();
    expect(titleBox).toBeTruthy();
    expect(chromeBox).toBeTruthy();
    expect(cardBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(newsBox).toBeTruthy();

    expect(titleBox!.y).toBeLessThan(36);
    expect(cardBox!.y - (chromeBox!.y + chromeBox!.height)).toBeLessThan(16);
    expect(footerBox!.y - (cardBox!.y + cardBox!.height)).toBeLessThan(24);
    expect(newsBox!.height).toBeGreaterThan(160);
    expect(footerBox!.height).toBeLessThan(64);
  });

  test("Worker 405 still shows real headlines via the JSON RSS fallback", async ({ page }) => {
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async (route) => {
      await route.fulfill({
        status: 405,
        contentType: "application/json",
        body: JSON.stringify({ error: "method_not_allowed" }),
      });
    });
    await page.route(/api\.rss2json\.com/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          items: [
            {
              title: "Startup tech à Gatineau - Le Droit",
              link: "https://news.google.com/rss/articles/abc",
              pubDate: "2026-09-16 10:00:00",
              author: "",
            },
          ],
        }),
      });
    });

    await page.goto("./?city=Gatineau");
    const news = page.locator("[data-neighborhood-news]");
    await expect(news).toHaveAttribute("data-news-status", "ready", { timeout: 12_000 });
    await expect(page.getByText(/Startup tech/)).toBeVisible();
    await expect(page.getByText("Chargement des nouvelles locales…")).toHaveCount(0);
  });

  test("hanging Worker and fallback settle to error instead of infinite loading", async ({
    page,
  }) => {
    test.setTimeout(20_000);
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async () => {
      await new Promise(() => {});
    });
    await page.route(/api\.rss2json\.com/, async () => {
      await new Promise(() => {});
    });

    await page.goto("./?city=Gatineau");
    const news = page.locator("[data-neighborhood-news]");
    await expect(news).toHaveAttribute("data-news-status", "error", { timeout: 15_000 });
    await expect(page.getByText("Chargement des nouvelles locales…")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.locator("[data-partner-slot]")).toHaveCount(2);
  });
});
