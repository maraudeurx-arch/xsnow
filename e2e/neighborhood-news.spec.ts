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
    await expect(page.getByText(/ferme à clics|exemple|pas de revenus pubs/i).first()).toBeVisible();
    await expect(page.getByText(/Grok et Cursor/).first()).toBeVisible();
    await expect(page.locator("[data-partner-creative]").first()).toBeVisible();
    await expect(page.locator("[data-partner-link]").first()).toBeVisible();
    await expect(page.locator('[data-partner-cta="register"]').first()).toBeVisible();
    await expect(page.locator('[data-partner-cta="share"]').first()).toBeVisible();
    await expect(page.getByText("S’inscrire / Mes infos").first()).toBeVisible();
    await expect(page.getByText("Partager / inviter").first()).toBeVisible();

    const title = page.getByRole("heading", { level: 1, name: "Open Community" });
    await expect(title).toBeVisible();
    const titleBox = await title.boundingBox();
    expect(titleBox).toBeTruthy();
    expect(titleBox!.y).toBeLessThan(10);

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

    const chrome = page.locator(".chrome-panel");
    const chromeBox = await chrome.boundingBox();
    expect(chromeBox).toBeTruthy();
    expect(chromeBox!.y).toBeLessThan(64);

    const gap = footerBox!.y - (cardBox!.y + cardBox!.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(2);
    expect(newsBox!.height).toBeGreaterThan(chatBox!.height);
    expect(newsBox!.height).toBeGreaterThan(450);

    const newsList = page.locator("[data-news-list], [data-news-spacer]");
    const listBox = await newsList.first().boundingBox();
    expect(listBox).toBeTruthy();
    // Both partner units sit under the full list (no mid-ad hang), so the
    // scroller is the leftover above the ads — still a tall fill, not 250px of
    // headlines-only from when the mid unit lived inside the list.
    expect(listBox!.height).toBeGreaterThan(220);

    const newsChatGap = chatBox!.y - (newsBox!.y + newsBox!.height);
    expect(newsChatGap).toBeGreaterThanOrEqual(-1);
    expect(newsChatGap).toBeLessThan(12);

    const bottomSlot = page.locator('[data-partner-slot="news-bottom"]');
    const bottomBox = await bottomSlot.boundingBox();
    expect(bottomBox).toBeTruthy();
    expect(bottomBox!.y + bottomBox!.height).toBeLessThanOrEqual(newsBox!.y + newsBox!.height + 1);

    const headlineLinks = page.locator("[data-neighborhood-news] [data-news-list] a[href^='http']");
    const headlineCount = await headlineLinks.count();
    expect(headlineCount).toBeGreaterThan(0);
    for (let i = 0; i < headlineCount; i += 1) {
      const hb = await headlineLinks.nth(i).boundingBox();
      if (!hb || !bottomBox) continue;
      const overlaps =
        hb.y < bottomBox.y + bottomBox.height && hb.y + hb.height > bottomBox.y;
      expect(overlaps, `headline ${i} overlaps bottom partner slot`).toBeFalsy();
    }

    await expect(page.getByRole("link", { name: "Gagner maintenant" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Vos idées" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();
    await expect(page.locator("[data-home-inscrire]")).toHaveText("S’inscrire");
    await expect(page.locator("#avatar-chat")).toBeVisible();
    expect(chatBox!.y + chatBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);

    const privacy = page.getByRole("contentinfo").getByRole("link", { name: "Vie privée" });
    await expect(privacy).toBeVisible();
    const privacyBox = await privacy.boundingBox();
    expect(privacyBox).toBeTruthy();
    expect(privacyBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height - 1);
    expect(footerBox!.height).toBeLessThan(48);

    const bottomHeight = bottomBox!.height;
    expect(bottomHeight).toBeGreaterThan(110);
    await expect(page.getByRole("heading", { name: "Nouvelles du Quartier" })).toBeVisible();
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

  test("loading state still fills the Accueil card to the footer", async ({ page }) => {
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async () => {
      await new Promise(() => {});
    });
    await page.route(/api\.rss2json\.com/, async () => {
      await new Promise(() => {});
    });

    await page.goto("./?city=Gatineau");
    const news = page.locator("[data-neighborhood-news]");
    await expect(news).toHaveAttribute("data-news-status", "loading");
    await expect(page.getByText("Chargement des nouvelles locales…")).toBeVisible();

    const card = page.locator("#home-guide .home-stage");
    const footer = page.locator("footer");
    const cardBox = await card.boundingBox();
    const footerBox = await footer.boundingBox();
    const newsBox = await news.boundingBox();
    expect(cardBox).toBeTruthy();
    expect(footerBox).toBeTruthy();
    expect(newsBox).toBeTruthy();
    const gap = footerBox!.y - (cardBox!.y + cardBox!.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(3);
    expect(newsBox!.height).toBeGreaterThan(300);
    const spacer = page.locator("[data-news-spacer]");
    await expect(spacer).toBeVisible();
    const spacerBox = await spacer.boundingBox();
    expect(spacerBox!.height).toBeGreaterThan(200);
    await expect(page.getByRole("link", { name: "Gagner maintenant" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Partager" })).toBeVisible();
    await expect(page.locator("#avatar-chat")).toBeVisible();
    const privacy = page.getByRole("contentinfo").getByRole("link", { name: "Vie privée" });
    await expect(privacy).toBeVisible();
    const privacyBox = await privacy.boundingBox();
    expect(privacyBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height - 1);
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

  test("partner house ads and Accueil chip push register and invite", async ({ page }) => {
    await seedReturningVisitor(page);
    await page.route(/xsnow-chat\.xsnowopc\.workers\.dev\/news/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SAMPLE_NEWS),
      });
    });

    await page.goto("./?city=Gatineau");
    await expect(page.locator("[data-neighborhood-news]")).toHaveAttribute("data-news-status", "ready");

    const mid = page.locator('[data-partner-slot="news-mid"]');
    await expect(mid).toHaveAttribute("data-partner-kind", "register");
    await expect(mid.getByText("Publicité")).toBeVisible();
    await expect(mid.getByText("Espace partenaire")).toBeVisible();
    await expect(mid.locator('[data-partner-cta="register"]')).toBeVisible();
    await mid.locator("[data-partner-link]").click();
    await expect(page).toHaveURL(/\/mon-profil\/?$/);
    await expect(page.getByRole("button", { name: "S’inscrire" })).toBeVisible();

    await page.goto("./?city=Gatineau");
    await expect(page.locator("[data-neighborhood-news]")).toHaveAttribute("data-news-status", "ready");
    const bottom = page.locator('[data-partner-slot="news-bottom"]');
    await expect(bottom).toHaveAttribute("data-partner-kind", "share");
    await bottom.locator("[data-partner-link]").click();
    await expect(page).toHaveURL(/\/mon-profil\/inviter\/?/);
    await expect(page.getByText("Partager OPC")).toBeVisible();

    await page.goto("./?city=Gatineau");
    await page.locator("[data-home-inscrire]").click();
    await expect(page).toHaveURL(/\/mon-profil\/?$/);
    await expect(page.getByRole("button", { name: "S’inscrire" })).toBeVisible();
  });
});
