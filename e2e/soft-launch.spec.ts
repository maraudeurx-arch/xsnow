import { APP_VERSION } from "../src/lib/app-version";
import { PAID_MISSION_LINKS } from "../src/lib/paid-missions";
import { OPC_PUBLIC_EMAIL } from "../src/lib/paths";
import { SERVICE_KINDS, SERVICE_SEEDS, SERVICES } from "../src/lib/services";
import { expect, seedLocalProfile, stubIdeaInbox, test } from "./helpers";

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

  test("fresh storage: Mes services and En demande show four CTAs and stay empty", async ({ page }) => {
    await page.goto("./mes-services/");
    await expect(page.getByRole("heading", { name: "Mes services", level: 2 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Prêter ma voiture" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aider au déménagement" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baby-sitting" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mes compétences" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prêt d’outils" })).toHaveCount(0);
    await expect(page.getByText("Publiée")).toHaveCount(0);
    await expect(page.getByText(/Publiez ce que vous offrez/)).toHaveCount(0);
    await expect(page.getByText("Modèles")).toHaveCount(0);

    await page.getByRole("link", { name: "En demande" }).click();
    await expect(page).toHaveURL(/en-demande/);
    await expect(page.getByRole("heading", { name: "En demande", level: 2 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aide au déménagement" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Aide au bricolage" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Co-voiturage" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Prêt d’équipement" })).toBeVisible();
    await expect(page.getByText(/Offres de cet appareil/)).toHaveCount(0);
    await expect(page.getByText(/Entente privée entre voisins/)).toHaveCount(0);
    await expect(page.getByText(/Sur cet appareil seulement/)).toHaveCount(0);
  });

  test("Mes compétences requires sign-up then publishes into En demande", async ({ page }) => {
    await page.goto("./mes-services/");
    await page.getByRole("button", { name: "Mes compétences" }).click();
    await expect(page.locator("[data-signup-gate]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
    await expect(page.locator("[data-skills-form]")).toHaveCount(0);

    await page.locator('input[name="firstName"]').fill("Paul");
    await page.locator('input[name="lastName"]').fill("Émile");
    await page.locator('input[name="email"]').fill("paul@voisin.test");
    await page.locator('input[name="phone"]').fill("819-555-0199");
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page.locator("[data-skills-form]")).toBeVisible();
    await page.getByRole("checkbox", { name: "Mécanicien" }).check();
    await page.getByRole("checkbox", { name: "Autres" }).check();
    await page.getByPlaceholder("Précise ta compétence").fill("<script>alert(1)</script>Soudure");
    await page.getByRole("checkbox", { name: "Samedi" }).check();
    await page.getByRole("button", { name: "Publier dans En demande" }).click();

    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.offers"));
    expect(stored).toContain("skills");
    expect(stored).toContain("Soudure");
    expect(stored).not.toMatch(/<script/i);

    await page.getByRole("link", { name: "En demande" }).first().click();
    await expect(page).toHaveURL(/en-demande/);
    await expect(page.getByText("Mécanicien, Soudure")).toBeVisible();
    await expect(page.getByText("Compétences")).toBeVisible();
  });

  test("Gagner maintenant hides the heading, explains unaffiliated platforms, and keeps four apply links", async ({
    page,
  }) => {
    await seedLocalProfile(page);
    await page.goto("./gagner-maintenant/");
    await expect(page.getByRole("heading", { name: "Gagner maintenant", level: 2 })).toHaveCount(0);
    await expect(page.locator("[data-home-back]")).toBeVisible();
    await expect(page.getByText(/pas affiliées à OPC \/ Open Community/)).toBeVisible();
    await expect(page.getByText(/travailler depuis son téléphone/)).toBeVisible();

    for (const link of PAID_MISSION_LINKS) {
      const cta = page.getByRole("link", { name: link.label, exact: true });
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", link.url);
      await expect(cta).toHaveAttribute("target", "_blank");
    }
  });

  test("fresh storage: neighbourhood service boards stay empty", async ({ page }) => {
    for (const kind of SERVICE_KINDS) {
      await page.goto(`./services/${kind}/`);
      await expect(page.getByRole("heading", { name: SERVICES[kind].title, level: 2 })).toBeVisible();
      await expect(page.getByText("Aucune annonce pour ce filtre.")).toBeVisible();
      for (const listing of SERVICE_SEEDS[kind]) {
        await expect(page.getByText(listing.title)).toHaveCount(0);
      }
    }
  });

  test("Vos idées stay on this device and do not come back from the empty catalog", async ({ page }) => {
    await seedLocalProfile(page);
    const idea = `Déneiger les allées OPC-e2e ${Date.now()}`;
    await page.goto("./vos-idees/");
    await expect(page.getByLabel("Ton idée")).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer l’idée" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vos idées" })).toHaveCount(0);
    await expect(page.getByText("S’impliquer : Tête, Cœur, Mains")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Vos idées", level: 2 })).toHaveCount(0);
    await expect(page.locator("[data-home-back]")).toBeVisible();

    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();

    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(stored).toContain(idea);
    await expect(page.getByRole("status")).toContainText("Idée bien reçue");
    await expect(page.getByRole("status")).toContainText("enregistrée sur cet appareil");
    await expect(page.locator("[data-idea-inbox=sent]")).toContainText("opencommunity.opc@gmail.com");
    await expect(page.getByRole("button", { name: "Ajouter une autre idée" })).toBeEnabled();
    await expect(page.getByLabel("Ton idée")).toHaveCount(0);

    await page.getByRole("button", { name: "Ajouter une autre idée" }).click();
    await expect(page.getByLabel("Ton idée")).toHaveValue("");
    await expect(page.getByLabel("Ton idée")).toBeFocused();
    await expect(page.getByRole("button", { name: "Envoyer l’idée" })).toBeVisible();
    await expect(page.getByText("Idée bien reçue")).toHaveCount(0);
    await expect(page.locator("[data-idea-wall]")).toContainText(idea);
    await expect(page.getByText(/opencommunity\.opc@gmail\.com/).first()).toBeVisible();

    await page.reload();
    const storedAfterReload = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(storedAfterReload).toContain(idea);
    await expect(page.getByLabel("Ton idée")).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer l’idée" })).toBeVisible();

    await page.evaluate(() => {
      window.localStorage.removeItem("xsnow.ideas");
    });
    await page.reload();
    await expect(page.getByLabel("Ton idée")).toBeVisible();
    await expect(page.getByRole("button", { name: "Envoyer l’idée" })).toBeVisible();
    // Device backup may restore this visitor’s idea. The public catalog still ships none.
    await expect(page.getByText("Café de réparation")).toHaveCount(0);
  });

  test("a Vos idées submit stays on-device when the owner email cannot be sent", async ({ page }) => {
    await seedLocalProfile(page);
    await stubIdeaInbox(page, "failed");
    const idea = `Hors ligne OPC-e2e ${Date.now()}`;
    await page.goto("./vos-idees/");
    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();
    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(stored).toContain(idea);
    await expect(page.getByRole("status")).toContainText("Idée bien reçue");
    await expect(page.locator("[data-idea-inbox=failed]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Renvoyer au propriétaire" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ajouter une autre idée" })).toBeEnabled();
  });

  test("local confirm and add-another do not wait for a slow inbox POST", async ({ page }) => {
    await seedLocalProfile(page);
    let releaseHold: (() => void) | undefined;
    const hold = new Promise<void>((resolve) => {
      releaseHold = resolve;
    });
    await page.route(/\/(ideas|register)(\?|$)/, async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        });
        return;
      }
      if (route.request().method() === "POST") {
        await hold;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "mail_failed" }),
        });
        return;
      }
      await route.fallback();
    });
    const idea = `Co-voiturage OPC-e2e ${Date.now()}`;
    await page.goto("./vos-idees/");
    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();

    await expect(page.getByRole("status")).toContainText("Idée bien reçue", { timeout: 2_000 });
    await expect(page.getByRole("button", { name: "Ajouter une autre idée" })).toBeEnabled({
      timeout: 1_000,
    });
    await expect(page.getByRole("button", { name: "Renvoyer au propriétaire" })).toHaveCount(0);
    const stored = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(stored).toContain(idea);

    await page.getByRole("button", { name: "Ajouter une autre idée" }).click();
    await expect(page.getByLabel("Ton idée")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Envoyer l’idée" })).toBeVisible();
    // Release the held stub fulfill — never unrouteAll (that leaked POSTs to production).
    releaseHold?.();
  });

  test("transparency pages are reachable from the footer", async ({ page }) => {
    const version = new RegExp(`Version ${APP_VERSION.replaceAll(".", "\\.")}`);
    await page.goto("./");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "À propos" }).click();
    await expect(page).toHaveURL(/about/);
    await expect(page.getByRole("heading", { name: "Qui est derrière OPC" })).toBeVisible();
    await expect(page.getByText(version)).toBeVisible();
    await expect(page.getByRole("link", { name: OPC_PUBLIC_EMAIL })).toBeVisible();
    await expect(page.getByRole("link", { name: "Code source sur GitHub" })).toBeVisible();

    await footer.getByRole("link", { name: "Comment ça marche" }).click();
    await expect(page).toHaveURL(/comment-ca-marche/);
    await expect(page.getByRole("heading", { name: "Comment ça marche" })).toBeVisible();
    await expect(page.getByRole("link", { name: OPC_PUBLIC_EMAIL })).toBeVisible();

    await footer.getByRole("link", { name: "Sécurité" }).click();
    await expect(page).toHaveURL(/securite/);
    await expect(page.getByRole("heading", { name: "Sécurité" })).toBeVisible();
    await expect(page.getByRole("link", { name: OPC_PUBLIC_EMAIL })).toBeVisible();
    await expect(page.getByRole("link", { name: "Politique de sécurité (SECURITY.md)" })).toBeVisible();

    await footer.getByRole("link", { name: "Vie privée" }).click();
    await expect(page).toHaveURL(/vie-privee/);
    await expect(page.getByRole("heading", { name: "Vie privée" })).toBeVisible();
    await expect(page.getByRole("link", { name: OPC_PUBLIC_EMAIL })).toBeVisible();

    await footer.getByRole("link", { name: "Conditions" }).click();
    await expect(page).toHaveURL(/conditions/);
    await expect(page.getByRole("heading", { name: "Conditions" })).toBeVisible();

    await footer.getByRole("link", { name: "Preuves" }).click();
    await expect(page).toHaveURL(/preuves-de-revenus/);
    await expect(page.getByRole("heading", { name: "Preuves de revenus" })).toBeVisible();
  });
});
