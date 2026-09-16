import { expect, test } from "./helpers";

test.describe("owner idea inbox", () => {
  test("secret form is shown and empty inbox invents no ideas", async ({ page }) => {
    await page.route(/\/ideas(\?|$)/, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        const auth = route.request().headers().authorization || "";
        if (auth !== "Bearer test-secret") {
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "unauthorized" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ ok: true, count: 0, compiled: [], ideas: [] }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("./proprietaire/idees/");
    await expect(page.getByRole("heading", { name: "Boîte d’idées", level: 2 })).toBeVisible();
    await expect(page.getByText(/Aucune idée n’est inventée/)).toBeVisible();
    await expect(page.getByLabel("Secret propriétaire")).toBeVisible();
    await expect(page.getByText("Déneiger")).toHaveCount(0);
    await expect(page.locator("[data-owner-idea]")).toHaveCount(0);

    await page.getByLabel("Secret propriétaire").fill("wrong");
    await page.getByRole("button", { name: "Ouvrir la boîte" }).click();
    await expect(page.getByText(/Secret refusé/)).toBeVisible();
    await expect(page.locator("[data-owner-empty]")).toHaveCount(0);

    await page.getByLabel("Secret propriétaire").fill("test-secret");
    await page.getByRole("button", { name: "Ouvrir la boîte" }).click();
    await expect(page.locator("[data-owner-empty]")).toBeVisible();
    await expect(page.locator("[data-owner-count]")).toContainText("0");
    await expect(page.getByText("Déneiger")).toHaveCount(0);
  });

  test("lists a sanitized idea from the worker and not a catalog fake", async ({ page }) => {
    await page.route(/\/ideas(\?|$)/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({
            ok: true,
            count: 1,
            compiled: [{ city: "Gatineau", n: 1 }],
            ideas: [
              {
                id: "inbox-1",
                text: "Partager une perceuse le samedi",
                city: "Gatineau",
                createdAt: Date.parse("2026-09-16T12:00:00.000Z"),
              },
            ],
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto("./proprietaire/idees/?secret=test-secret");
    await expect(page.locator("[data-owner-idea=inbox-1]")).toContainText("Partager une perceuse le samedi");
    await expect(page.locator("[data-owner-count]")).toContainText("1");
    await expect(page.getByText("Gatineau — 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Exporter JSON" })).toBeVisible();
  });
});
