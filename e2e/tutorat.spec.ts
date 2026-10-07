import { expect, skipConsent, test } from "./helpers";

/**
 * Tutorat B0 — hidden section.
 * Default build (CI): `/tutorat/` is not part of the export (404).
 * Flagged build (`NEXT_PUBLIC_TUTORAT=1 npm run build`, then `E2E_TUTORAT=1 npm run test:e2e`):
 * the noindex preview renders in FR / EN / ES.
 */
const flagged = process.env.E2E_TUTORAT === "1";

test.describe("Tutorat (hidden section)", () => {
  test.skip(flagged, "default-build check");

  test("/tutorat/ is absent from the default export", async ({ page }) => {
    const response = await page.goto("./tutorat/");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Tutorat preview (flagged build)", () => {
  test.skip(!flagged, "needs NEXT_PUBLIC_TUTORAT=1 build and E2E_TUTORAT=1");

  const CASES = [
    { lang: "fr", title: "Tutorat en ligne", adults: "Réservé aux personnes de 18 ans et plus." },
    { lang: "en", title: "Online tutoring", adults: "For people aged 18 and over only." },
    { lang: "es", title: "Tutoría en línea", adults: "Solo para personas de 18 años o más." },
  ] as const;

  for (const c of CASES) {
    test(`renders placeholder copy in ${c.lang}, noindex`, async ({ page }) => {
      await skipConsent(page);
      const response = await page.goto(`./tutorat/?lang=${c.lang}`);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      const preview = page.locator("[data-tutorat-preview]");
      await expect(preview).toHaveAttribute("lang", c.lang);
      await expect(preview.getByRole("heading", { name: c.title })).toBeVisible();
      await expect(preview.getByText(c.adults)).toBeVisible();
      await expect(preview.locator("form")).toHaveCount(0);
    });
  }
});
