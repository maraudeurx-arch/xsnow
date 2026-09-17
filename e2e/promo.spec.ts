import { expect, test } from "./helpers";

const PAGES = [
  {
    path: "./promo/competences.html",
    heading:
      "Avez-vous une compétence qui serait profitable dans votre quartier ? (peintre, chauffeur, mécanicien) Faites-le savoir.",
  },
  {
    path: "./promo/commerce.html",
    heading:
      "Avez-vous un commerce à faire connaître dans le quartier ? (garderie, restaurant, tutorat sur Zoom) Faites-le savoir.",
  },
  {
    path: "./promo/",
    heading: "Open Community — Monétisé Vous! Inscription gratuite.",
  },
] as const;

test.describe("WhatsApp promo landings", () => {
  for (const pageInfo of PAGES) {
    test(`${pageInfo.path} is a real Cliquez ici button on a light page`, async ({ page }) => {
      const response = await page.goto(pageInfo.path);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("html")).toHaveAttribute("lang", "fr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(pageInfo.heading);
      const cta = page.getByRole("link", { name: "Cliquez ici", exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "https://maraudeurx-arch.github.io/xsnow/");
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(120);
      await expect(page.getByText(/Gatineau/i)).toHaveCount(0);
    });
  }
});
