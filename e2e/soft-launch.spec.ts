import { expect, test } from "./helpers";

test.describe("Open Community soft-launch smoke", () => {
  test("home loads with the Open Community banner and avatar rings", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("heading", { name: "Open Community", level: 1 })).toBeVisible();
    await expect(page.getByText("Monétisé Vous!")).toBeVisible();
    await expect(page.getByRole("button", { name: /Connect/ })).toBeVisible();
    await expect(page.getByText("Choisis ton avatar")).toBeVisible();

    const discs = page.locator(".avatar-disc");
    await expect(discs).toHaveCount(4);
    const rings = await discs.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).getPropertyValue("--avatar-ring").trim()),
    );
    expect(new Set(rings).size).toBe(4);
    for (const ring of rings) {
      expect(ring).toMatch(/^#/i);
    }
  });

  test("fresh storage: Mes services and En demande stay empty", async ({ page }) => {
    await page.goto("./mes-services/");
    await expect(page.getByRole("heading", { name: "Mes services", level: 2 })).toBeVisible();
    await expect(page.getByText(/Pas encore d’offre sur cet appareil/)).toBeVisible();
    await expect(page.getByText("Publiée")).toHaveCount(0);

    await page.getByRole("link", { name: "En demande" }).click();
    await expect(page).toHaveURL(/en-demande/);
    await expect(page.getByText(/appareil neuf commence vide/)).toBeVisible();
    await expect(page.getByText(/pas d’offre Gatineau injectée/i)).toBeVisible();
    await expect(page.getByText(/Aucune demande pour l’instant/)).toBeVisible();
  });

  test("Vos idées stay on this device and do not come back from the empty catalog", async ({ page }) => {
    const idea = `Déneiger les allées OPC-e2e ${Date.now()}`;
    await page.goto("./vos-idees/");
    await expect(page.getByText("Pas encore d’idée ici.")).toBeVisible();

    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: /Mains/ }).click();
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();

    await expect(page.getByText("Merci — tu fais partie d’ici.")).toBeVisible();
    await expect(page.getByText(idea).first()).toBeVisible();

    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(stored).toContain(idea);

    await page.reload();
    await expect(page.getByText(idea).first()).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.removeItem("xsnow.ideas");
    });
    await page.reload();
    await expect(page.getByText("Pas encore d’idée ici.")).toBeVisible();
    await expect(page.getByText(idea)).toHaveCount(0);
  });

  test("transparency pages are reachable from the footer", async ({ page }) => {
    await page.goto("./");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "À propos" }).click();
    await expect(page).toHaveURL(/about/);
    await expect(page.getByRole("heading", { name: "Qui est derrière OPC" })).toBeVisible();
    await expect(page.getByText(/Version 0\.3\.0/)).toBeVisible();

    await footer.getByRole("link", { name: "Comment ça marche" }).click();
    await expect(page).toHaveURL(/comment-ca-marche/);
    await expect(page.getByRole("heading", { name: "Comment ça marche" })).toBeVisible();

    await footer.getByRole("link", { name: "Sécurité" }).click();
    await expect(page).toHaveURL(/securite/);
    await expect(page.getByRole("heading", { name: "Sécurité" })).toBeVisible();

    await footer.getByRole("link", { name: "Vie privée" }).click();
    await expect(page).toHaveURL(/vie-privee/);
    await expect(page.getByRole("heading", { name: "Vie privée" })).toBeVisible();
  });
});
