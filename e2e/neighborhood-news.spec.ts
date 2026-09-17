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
  ],
};

async function seedReturningVisitor(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
    window.localStorage.setItem("xsnow.geoConsent", JSON.stringify("skipped"));
    window.localStorage.setItem("xsnow.analyticsConsent", JSON.stringify("denied"));
  });
}

test.describe("Accueil full-bleed ads reel", () => {
  test("ads reel fills the former news card", async ({ page }) => {
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
    await expect(news).toHaveAttribute("data-news-ads-only", "");
    const adsReel = page.locator("[data-accueil-ads-reel]");
    await expect(adsReel).toHaveCount(1);
    await expect(adsReel.locator("[data-ad-image]")).toBeVisible();

    const newsBox = await news.boundingBox();
    const reelBox = await adsReel.boundingBox();
    const chatBox = await page.locator("#avatar-chat").boundingBox();
    expect(newsBox).toBeTruthy();
    expect(reelBox).toBeTruthy();
    expect(chatBox).toBeTruthy();
    expect(newsBox!.height).toBeGreaterThan(chatBox!.height);
    expect(reelBox!.height).toBeGreaterThan(280);
    // Reel nearly fills the news card
    expect(reelBox!.height).toBeGreaterThan(newsBox!.height * 0.85);

    await expect(page.getByRole("heading", { name: "Nouvelles du Quartier" })).toHaveCount(0);
  });

  test("rotates every 5 seconds", async ({ page }) => {
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SAMPLE_NEWS),
      });
    });

    await page.goto("./?city=Gatineau");
    const reel = page.locator("[data-accueil-ads-reel]");
    await expect(reel).toHaveAttribute("data-ad-id", "bogo-cat");
    await expect(reel).toHaveAttribute("data-ad-id", "garderie-zozo", { timeout: 7_000 });
  });
});
