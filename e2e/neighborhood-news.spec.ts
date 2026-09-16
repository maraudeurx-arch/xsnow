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
    await expect(page.getByText("Publicité").first()).toBeVisible();
    await expect(page.getByText(/ferme à clics|exemple|soft-launch|pas une publicité vendue|pas de revenus pubs/i).first()).toBeVisible();
    await expect(page.getByText(/Grok et Cursor/).first()).toBeVisible();
    await expect(page.locator("[data-partner-creative]").first()).toBeVisible();
    await expect(page.locator("[data-partner-link]").first()).toBeVisible();

    const card = page.locator("#home-guide .home-stage");
    const footer = page.locator("footer");
    const cardBox = await card.boundingBox();
    const footerBox = await footer.boundingBox();
    const newsBox = await news.boundingBox();
    const chatBox = await page.locator("#avatar-chat").boundingBox();
    expect(cardBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(newsBox).toBeTruthy();
    expect(chatBox).toBeTruthy();

    const gap = footerBox!.y - (cardBox!.y + cardBox!.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(8);
    expect(newsBox!.height).toBeGreaterThan(chatBox!.height);
    expect(newsBox!.height).toBeGreaterThan(260);

    const privacy = page.getByRole("contentinfo").getByRole("link", { name: "Vie privée" });
    await expect(privacy).toBeVisible();
    const privacyBox = await privacy.boundingBox();
    expect(privacyBox).toBeTruthy();
    expect(privacyBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height - 1);
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
