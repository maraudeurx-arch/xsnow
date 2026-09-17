import { expect, test } from "./helpers";

test.describe("local registration on Mon profil", () => {
  test("Sign up button saves a device-local OPC number and shows initials by the logo", async ({
    page,
  }) => {
    await page.goto("./mon-profil/");
    await expect(page.getByRole("heading", { name: "Mon profil", level: 2 })).toBeVisible();
    await expect(page.locator("[data-home-back]")).toBeVisible();

    const hub = page.getByRole("navigation", { name: "Mon profil" });
    await expect(hub.getByRole("link", { name: "Mes infos" })).toHaveCount(0);
    await expect(hub.getByRole("link", { name: "Réglages" })).toBeVisible();
    await expect(hub.getByRole("link", { name: "À propos de Open Community (OPC)" })).toBeVisible();

    const installGuide = page.locator("[data-install-guide]");
    await expect(installGuide).toBeVisible();
    await expect(installGuide.getByRole("heading", { name: "Mettre OPC sur l’écran d’accueil" })).toBeVisible();
    await expect(installGuide.getByText(/Ouvre exactement https:\/\/opencommunity\.app\//)).toBeVisible();
    await expect(installGuide.getByRole("link", { name: "https://opencommunity.app/" })).toBeVisible();
    await expect(installGuide.getByText(/There isn’t a GitHub Pages site here/)).toBeVisible();
    await expect(installGuide.getByText(/Partager/)).toBeVisible();
    await expect(installGuide.getByText(/Sur l’écran d’accueil/)).toBeVisible();
    await expect(installGuide.getByText(/Android \(Chrome\)/)).toBeVisible();
    await expect(installGuide.getByText(/Installer l’app/)).toBeVisible();
    await expect(installGuide.getByRole("button", { name: "Compris" })).toHaveCount(0);
    await expect(hub.getByRole("link", { name: /Vos idées/ })).toHaveCount(0);
    await expect(hub.getByRole("link", { name: /Inviter d’autres/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Partager", exact: true })).toHaveCount(0);

    const cta = page.getByRole("button", { name: "S’inscrire" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveCSS("background-color", "rgb(29, 78, 216)");
    await cta.click();

    await page.locator('input[name="firstName"]').fill("Marie");
    await page.locator('input[name="lastName"]').fill("Tremblay");
    await page.locator('input[name="email"]').fill("marie@voisin.test");
    await page.locator('input[name="phone"]').fill("819-555-0100");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.getByText("Profil enregistré sur cet appareil.")).toBeVisible();
    const member = page.locator("[data-member-id]");
    await expect(member).toHaveText(/Numéro OPC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}/);

    const headerName = page.locator("[data-header-profile]");
    await expect(headerName).toHaveText("M.T.");
    await expect(headerName).not.toContainText("@");
    await expect(headerName).not.toContainText("555");
    await expect(page.locator("[data-header-profile]")).toHaveCount(1);

    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.localProfile"));
    expect(stored).toContain("marie@voisin.test");
    expect(stored).toContain("819-555-0100");
    expect(stored).toMatch(/OPC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}/);

    await expect(page.getByRole("button", { name: "Modifier le profil" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Partager", exact: true })).toHaveCount(0);
    await expect(page.locator("[data-share-panel]")).toHaveCount(0);
    await expect(page.getByText("Inviter quelqu’un")).toHaveCount(0);
    await expect(page.locator("[data-infos-privacy]")).toHaveCount(0);
    await expect(page.locator("[data-infos-privacy-inline]")).toHaveCount(0);
    // Connect stays in the top nav only — not duplicated in the Mon profil body.
    await expect(page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: /Connect/ })).toBeVisible();
    await expect(page.locator("main").getByRole("button", { name: /Connect/ })).toHaveCount(0);

    await page.locator("[data-home-back]").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveURL(/mon-profil/);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.getByRole("button", { name: /Connect/ })).toBeVisible();
  });

  test("always shows iPhone home-screen steps in FR, EN, and ES", async ({ page }) => {
    await page.goto("./mon-profil/");
    const guide = page.locator("[data-install-guide]");
    await expect(guide.getByRole("heading", { name: "Mettre OPC sur l’écran d’accueil" })).toBeVisible();
    await expect(guide.getByText(/https:\/\/opencommunity\.app\//).first()).toBeVisible();
    await expect(guide.getByText(/Partager/)).toBeVisible();
    await expect(guide.getByText(/Sur l’écran d’accueil/)).toBeVisible();

    await page.getByRole("button", { name: "English" }).click();
    await expect(guide.getByRole("heading", { name: "Put OPC on the Home Screen" })).toBeVisible();
    await expect(guide.getByRole("link", { name: "https://opencommunity.app/" })).toBeVisible();
    await expect(guide.getByText(/Share/)).toBeVisible();
    await expect(guide.getByText(/Add to Home Screen/)).toBeVisible();
    await expect(guide.getByText(/Install app/)).toBeVisible();
    await expect(guide.getByText(/There isn’t a GitHub Pages site here/)).toBeVisible();

    await page.getByRole("button", { name: "Español" }).click();
    await expect(guide.getByRole("heading", { name: "Poner OPC en la pantalla de inicio" })).toBeVisible();
    await expect(guide.getByText(/Compartir/)).toBeVisible();
    await expect(guide.getByText(/elige Añadir a pantalla de inicio/)).toBeVisible();
  });

  test("strips HTML from the name and never shows email in the header", async ({ page }) => {
    await page.goto("./mon-profil/");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await page.locator('input[name="firstName"]').fill("<script>alert(1)</script>Paul");
    await page.locator('input[name="lastName"]').fill("Émile");
    await page.locator('input[name="email"]').fill("paul@voisin.test");
    await page.locator('input[name="phone"]').fill("8195550199");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.locator("[data-header-profile]")).toHaveText("P.É.");
    await expect(page.locator("[data-header-profile]")).not.toContainText("script");
    await expect(page.locator("[data-header-profile]")).not.toContainText("@");
    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.localProfile"));
    expect(stored).not.toMatch(/<script/i);
    expect(stored).toContain('"firstName":"Paul"');
  });
});
