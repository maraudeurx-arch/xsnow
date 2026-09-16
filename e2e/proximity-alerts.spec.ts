import { expect, test } from "./helpers";

test.describe("Alertes de proximité", () => {
  test.use({
    geolocation: { latitude: 45.4765, longitude: -75.7013 },
    permissions: ["geolocation"],
  });

  test("guardian sets proche, place, weekly hours, 5/10/20 km, and the proche can accept", async ({
    page,
  }) => {
    await page.goto("./alertes/");
    await expect(page.getByRole("heading", { name: "Alertes de proximité" })).toBeVisible();
    await expect(page.getByText(/Chaque proche doit ouvrir Open Community/)).toBeVisible();
    await expect(page.locator("[data-alert-board]").getByText(/Apple Localiser/)).toBeVisible();
    await expect(page.locator("[data-alert-board]").getByText(/iCloud/)).toBeVisible();
    await expect(page.getByText(/écran d’accueil/)).toBeVisible();
    await expect(page.getByText("Horaire de la semaine")).toBeVisible();
    await expect(page.getByText("Lundi")).toBeVisible();
    await expect(page.getByText("Dimanche")).toBeVisible();

    await page.getByLabel("Prénom").fill("Léo");
    await page.getByLabel("Endroit où la personne doit être").fill("École de l’Île");
    await page.getByLabel("Distance d’alerte").selectOption("10");
    await page.getByRole("button", { name: "Créer l’alerte" }).click();

    const card = page.locator("[data-alert-card]").first();
    await expect(card.getByText("Léo")).toBeVisible();
    await expect(card.getByText("Enfant")).toBeVisible();
    await expect(card.getByText(/10 km/)).toBeVisible();
    await expect(card.getByText("En attente d’acceptation")).toBeVisible();
    const invite = await card.locator("[data-alert-invite-url]").innerText();
    expect(invite).toMatch(/\/alertes\/\?alerte=alr-/);
    const token = invite.match(/alerte=(alr-[a-z0-9]+)/)?.[1];
    expect(token).toBeTruthy();

    await page.goto(`./alertes/?alerte=${token}`);
    await expect(page.locator("[data-alert-consent]")).toBeVisible();
    await expect(page.locator("[data-alert-consent]").getByText(/Pas Apple Localiser/i)).toBeVisible();
    await page.getByRole("button", { name: "J’accepte de partager ma position" }).click();
    await expect(page.getByText(/Cet appareil partage la position pour Léo/)).toBeVisible();
    await expect(page.getByText("Partage accepté par le proche")).toBeVisible();
  });
});
