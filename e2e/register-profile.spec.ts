import { expect, test } from "./helpers";

test.describe("local registration on Mon profil", () => {
  test("Sign up button saves a device-local OPC number, wires invite=opc-xxxx, and shows initials by the logo", async ({
    page,
  }) => {
    await page.goto("./mon-profil/");
    await expect(page.getByRole("heading", { name: "Mon profil", level: 2 })).toBeVisible();
    await expect(page.locator("[data-home-back]")).toBeVisible();

    const hub = page.getByRole("navigation", { name: "Mon profil" });
    await expect(hub.getByRole("link", { name: "Mes infos" })).toBeVisible();
    await expect(hub.getByRole("link", { name: "Réglages" })).toBeVisible();
    await expect(hub.getByRole("link", { name: "À propos de Open Community (OPC)" })).toBeVisible();
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
    const shareCta = page.getByRole("button", { name: "Partager", exact: true });
    await expect(shareCta).toBeVisible();
    await expect(shareCta).toHaveCSS("background-color", "rgb(29, 78, 216)");
    await expect(page.getByText("Inviter quelqu’un")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copier", exact: true })).toHaveCount(0);

    await shareCta.click();
    await expect(page.locator("[data-share-panel]")).toBeVisible();
    await expect(page.getByText(/Marie t’invite sur Open Community/)).toBeVisible();
    await expect(page.getByText(/invite=opc-/)).toBeVisible();
    await expect(page.getByText(/Numéro membre : OPC-/)).toBeVisible();
    const shareCode = await page.evaluate(() => window.localStorage.getItem("xsnow.shareCode"));
    expect(shareCode).toMatch(/^opc-[a-z0-9]{4}$/);
    await expect(page.getByRole("button", { name: "Modifier", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copier", exact: true })).toBeVisible();

    await page.locator("[data-home-back]").click();
    await expect(page).toHaveURL(/\/xsnow\/?$/);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.getByRole("button", { name: /Connect/ })).toBeVisible();
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
