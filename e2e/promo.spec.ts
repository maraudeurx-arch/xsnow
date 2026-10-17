import { expect, test } from "./helpers";

// Pages built from public/promo/*.html (image card + Cliquez ici CTA, no <h1>).
const LANDINGS = [
  {
    path: "./promo/competences.html",
    title: "Faites connaître votre compétence · Open Community",
    imageAlt: /Faites connaître votre compétence/,
  },
  {
    path: "./promo/commerce.html",
    title: "Faites connaître votre commerce · Open Community",
    imageAlt: /Faites connaître votre commerce/,
  },
] as const;

const APP_URL = "https://opencommunity.app/";

test.describe("WhatsApp promo landings", () => {
  for (const pageInfo of LANDINGS) {
    test(`${pageInfo.path} is a real Cliquez ici button on a light page`, async ({ page }) => {
      const response = await page.goto(pageInfo.path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page).toHaveTitle(pageInfo.title);
      await expect(page.getByRole("img", { name: pageInfo.imageAlt })).toBeVisible();
      const cta = page.getByRole("link", { name: "Cliquez ici", exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", APP_URL);
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(120);
      await expect(page.getByText(/Gatineau/i)).toHaveCount(0);
      await expect(page.locator('a[href^="http://"]')).toHaveCount(0);
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", /^https:\/\/opencommunity\.app\//);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\/opencommunity\.app\//);
    });
  }

  test("./promo/ lists both landings and the app", async ({ page }) => {
    const response = await page.goto("./promo/");
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Open Community");
    await expect(page.getByRole("link", { name: "Pub compétences" })).toHaveAttribute("href", "./competences.html");
    await expect(page.getByRole("link", { name: "Pub commerce" })).toHaveAttribute("href", "./commerce.html");
    await expect(page.getByRole("link", { name: "Aller sur l’app" })).toHaveAttribute("href", APP_URL);
    await expect(page.locator('a[href^="http://"]')).toHaveCount(0);
  });
});
