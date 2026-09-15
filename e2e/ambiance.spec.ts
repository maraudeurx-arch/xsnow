import { expect, test } from "./helpers";

test.describe("regional ambiance backgrounds", () => {
  test("first paint without a country stays on the autumn season photo", async ({ page }) => {
    await page.goto("./");
    const photo = page.locator("img.season-photo").first();
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute("src", /\/backgrounds\/na-autumn\.jpg/);
    await expect(page.locator('[data-ambiance="autumn"][data-season="autumn"]').first()).toBeVisible();
    await expect(page.locator("img.season-photo[src*='caribbean']")).toHaveCount(0);
  });

  test("Haiti / Port-au-Prince uses the Caribbean image, not Gatineau autumn", async ({ page }) => {
    await page.goto("./?city=Port-au-Prince");
    await expect(page.getByRole("link", { name: /PORT-AU-PRINCE/i })).toBeVisible();
    await expect(page.locator("img.season-photo[src*='caribbean']").first()).toBeVisible();
    await expect(page.locator('[data-ambiance="caribbean"]').first()).toBeVisible();
  });

  test("Canada keeps a calendar season photo", async ({ page }) => {
    await page.goto("./?city=Gatineau");
    await expect(page.getByRole("link", { name: /GATINEAU/i })).toBeVisible();
    const src = await page.locator("img.season-photo").first().getAttribute("src");
    expect(src).toMatch(/\/backgrounds\/na-(autumn|winter|spring|summer)\.jpg/);
    await expect(page.locator("img.season-photo[src*='caribbean']")).toHaveCount(0);
  });

  test("Europe, Asia, Africa, and South America match the approved ambiances", async ({ page }) => {
    await page.goto("./?city=Paris");
    await expect(page.locator("img.season-photo[src*='europe-meadow']").first()).toBeVisible();

    await page.goto("./?region=asia");
    await expect(page.locator("img.season-photo[src*='asia-terraces']").first()).toBeVisible();

    await page.goto("./?region=africa");
    await expect(page.locator("img.season-photo[src*='africa-sahel']").first()).toBeVisible();

    await page.goto("./?region=southamerica");
    await expect(page.locator("img.season-photo[src*='southamerica-andes']").first()).toBeVisible();
  });
});
