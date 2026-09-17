import { expect, test } from "./helpers";

test.describe("pubs reel, avatar coach, business AI draft", () => {
  test("full-height ads screen seeds Bogo, daycare, and Gatineau apartment", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
    });
    await page.goto("./pubs/");

    const screen = page.locator("[data-ads-video-screen]");
    await expect(screen).toBeVisible();
    await expect(screen).toHaveAttribute("data-ad-id", "bogo-cat");
    const box = await screen.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(420);
    await expect(page.getByRole("heading", { name: "Bogo" })).toBeVisible();
    await expect(page.locator("[data-ad-image=bogo-cat]")).toBeVisible();
    await expect(page.locator("[data-ad-download=bogo-cat]")).toBeVisible();

    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(screen).toHaveAttribute("data-ad-id", "daycare-flyer");
    const flyer = page.locator("[data-ad-card=flyer]");
    await expect(flyer).toBeVisible();
    await expect(flyer.getByRole("heading", { name: "Place en garderie du quartier" })).toBeVisible();

    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(screen).toHaveAttribute("data-ad-id", "apartment-gatineau");
    const summary = page.locator("[data-ad-card=summary]");
    await expect(summary).toBeVisible();
    await expect(summary.getByRole("heading", { name: "Chambre à Gatineau" })).toBeVisible();
    await expect(summary).toContainText("Gatineau");
    await expect(page.locator("[data-ad-rent]")).toContainText("533");
    await expect(page.locator("[data-ad-date]")).toHaveText("1er octobre");
    await expect(page.getByText(/Environ 533/)).toBeVisible();
  });

  test("avatar coach asks questions then shows 3–5 paths without promising income", async ({
    page,
  }) => {
    await page.goto("./coach/");
    await expect(page.getByRole("heading", { name: "Coach avatar" })).toBeVisible();
    await expect(page.locator("[data-coach-no-income]")).toContainText("Aucune promesse de revenu");
    await expect(page.locator("[data-coach-paths]")).toHaveCount(0);

    await page.locator("[data-coach-intent=skill]").click();
    await page.locator("[data-coach-time=yes]").click();

    const paths = page.locator("[data-coach-path]");
    await expect(paths).toHaveCount(5);
    await expect(page.locator("[data-coach-path=skills]")).toBeVisible();
    await expect(page.locator("[data-coach-path=earn]")).toContainText("sans affiliation ni promesse de revenu");
    await expect(page.locator("[data-avatar-coach]")).not.toContainText(/revenu garanti|salaire garanti|tu gagneras/i);
  });

  test("business form drafts with Workers AI and refuses a Facebook link", async ({ page }) => {
    await page.goto("./business/");
    await expect(page.getByRole("heading", { name: "Faites connaître votre business par des pubs" })).toBeVisible();
    await expect(page.getByText(/ne visite pas Facebook/)).toBeVisible();

    await page.locator('input[name="name"]').fill("Page Facebook");
    await page.locator('textarea[name="description"]').fill("https://www.facebook.com/moncommerce");
    await page.locator("[data-business-ai]").click();
    await expect(page.locator("[data-business-ai-status]")).toContainText(/Pas de scrape Facebook/);

    await page.locator('input[name="name"]').fill("Café du coin");
    await page.locator('input[name="city"]').fill("Gatineau");
    await page.locator('textarea[name="description"]').fill("Brunch le samedi");
    await page.locator("[data-business-ai]").click();
    await expect(page.locator('textarea[name="description"]')).toHaveValue(/Café du coin/);
  });
});
