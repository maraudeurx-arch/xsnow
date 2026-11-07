import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent, stubIdeaInbox } from "./helpers";

// « Vendre mes idées » (décision Popol, 06/11/2026) — mobile viewport (390×844, see playwright.config.ts).
test.describe("Vendre mes idées dialog on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await stubIdeaInbox(page);
    await page.goto("gagner-maintenant/");
  });

  test("the case opens the dialog; footer banner never overlaps « Fermer »", async ({ page }) => {
    const cta = page.locator("[data-earn-idea-sale-cta]");
    await expect(cta).toContainText("Vendre mes idées");
    await cta.click();
    const dialog = page.locator("[data-idea-sale-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Vendre mes idées" })).toBeVisible();
    await expect(dialog.locator("[data-idea-sale-secret-warning]")).toContainText("mot de passe");
    await expect(page.locator("html")).toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeHidden();
    const close = page.locator("[data-idea-sale-close]");
    await close.scrollIntoViewIfNeeded();
    // The topmost element at the centre of « Fermer » must be the button itself.
    const hit = await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && el.contains(top);
    });
    expect(hit).toBe(true);
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/opc-modal-open/);
    await expect(page.locator(".safe-frame > footer")).toBeVisible();
  });

  test("an incomplete proposal is refused with the check message", async ({ page }) => {
    await page.locator("[data-earn-idea-sale-cta]").click();
    const form = page.locator("[data-idea-sale-form]");
    await expect(form).toBeVisible();
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[role="alert"]')).toContainText("Vérifie le titre");
    await expect(page.locator("[data-idea-sale-sent]")).toHaveCount(0);
  });

  test("a complete proposal is sent to the team inbox", async ({ page }) => {
    // Capture every POST the dialog makes, so the test verifies what
    // actually leaves the device — not just the on-screen thanks.
    const posts: Array<{ path: string; body: Record<string, unknown> | null }> = [];
    page.on("request", (request) => {
      if (request.method() !== "POST") return;
      let path = "";
      try {
        path = new URL(request.url()).pathname;
      } catch {
        return;
      }
      if (!/\/(ideas|register|idea-sale-confirmation|idea-attachments)$/.test(path)) return;
      let body: Record<string, unknown> | null = null;
      try {
        body = request.postDataJSON() as Record<string, unknown>;
      } catch {
        body = null;
      }
      posts.push({ path, body });
    });
    // The seller receipt e-mail (ajout nº 6) also goes through the Worker:
    // stub it like the inbox, or the fixture would hit production.
    await page.route(/\/idea-sale-confirmation(\?|$)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true, emailed: true }),
      });
    });

    await page.locator("[data-earn-idea-sale-cta]").click();
    const form = page.locator("[data-idea-sale-form]");
    await expect(form).toBeVisible();
    // Name + e-mail are prefilled from the seeded device profile (Marie Tremblay).
    // Located by label: the form now holds more inputs before them (summary
    // approval checkbox, price, attachment) than when this test was written.
    await expect(form.getByLabel("Ton nom")).toHaveValue("Marie Tremblay");
    await expect(form.getByLabel("Ton courriel")).toHaveValue("marie@voisin.test");
    await form.getByLabel("Titre de l’idée").fill("Cours de cuisine du quartier");
    await form.locator("select").selectOption("divertissement");
    await form.getByLabel("Description : l’idée").fill(
      "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins. Petit prix, groupes de huit, recettes à emporter.",
    );
    // The summary is proposed from the description, then corrected by the
    // seller: only the approved summary may travel, never the raw text.
    await form.locator("[data-idea-sale-summary-generate]").click();
    await expect(form.locator("[data-idea-sale-summary]")).toHaveValue(/recettes à emporter/);
    const approvedSummary =
      "Ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins, en groupes de huit.";
    await form.locator("[data-idea-sale-summary]").fill(approvedSummary);
    await form.getByLabel("J’approuve ce résumé").check();
    await form.getByLabel("Prix souhaité (en dollars US)").fill("250");
    await form.getByLabel("J’accepte que l’équipe").check();
    await form.locator('button[type="submit"]').click();
    await expect(page.locator("[data-idea-sale-sent]")).toContainText("a reçu ton idée");

    // « Mes idées proposées » keeps the seller's own copy, numbered, with
    // the approved summary and the desired price.
    const myIdea = page.locator("[data-idea-sale-my-idea]");
    await expect(myIdea).toHaveCount(1);
    await expect(myIdea.first()).toContainText("Idée nº 1");
    await expect(myIdea.first()).toContainText(approvedSummary);
    await expect(myIdea.first()).toContainText("Prix souhaité : 250 USD");

    // What reached the team inbox: the approved summary and the flattened
    // price — and nothing else. The raw working description never leaves
    // the device, and no name or e-mail rides in the ideas payload (the
    // register notice below is the consent channel for contact details).
    await expect
      .poll(() => posts.filter((p) => p.path.endsWith("/ideas")).length)
      .toBe(1);
    const ideaPost = posts.find((p) => p.path.endsWith("/ideas"))!;
    const ideaBody = ideaPost.body as { id: string; text: string; city: string; opcId: string };
    expect(Object.keys(ideaBody).sort()).toEqual(["city", "id", "opcId", "text"]);
    expect(ideaBody.opcId).toBe("OPC-7K3M");
    expect(ideaBody.text).toContain("[Idée à vendre]");
    expect(ideaBody.text).toContain("Titre: Cours de cuisine du quartier");
    expect(ideaBody.text).toContain(`Description: ${approvedSummary}`);
    expect(ideaBody.text).toContain("Prix souhaité: 250 USD");
    expect(ideaBody.text).not.toContain("recettes à emporter");
    expect(ideaBody.text).not.toContain("Petit prix");
    expect(ideaBody.text).not.toContain("Marie Tremblay");
    expect(ideaBody.text).not.toContain("marie@voisin.test");

    // Contact details travel only by the register notice, under consent.
    await expect
      .poll(() => posts.filter((p) => p.path.endsWith("/register")).length)
      .toBe(1);
    const registerBody = posts.find((p) => p.path.endsWith("/register"))!
      .body as { firstName: string; opcId: string; email: string };
    expect(registerBody.firstName).toBe("Marie");
    expect(registerBody.opcId).toBe("OPC-7K3M");
    expect(registerBody.email).toBe("marie@voisin.test");

    // Receipt e-mail to the seller, numbered like her on-device list.
    await expect
      .poll(() => posts.filter((p) => p.path.endsWith("/idea-sale-confirmation")).length)
      .toBe(1);
    const confirmationBody = posts.find((p) => p.path.endsWith("/idea-sale-confirmation"))!
      .body as { id: string; email: string; title: string; number: number; lang: string };
    expect(confirmationBody.id).toBe(ideaBody.id);
    expect(confirmationBody.email).toBe("marie@voisin.test");
    expect(confirmationBody.title).toBe("Cours de cuisine du quartier");
    expect(confirmationBody.number).toBe(1);
    expect(confirmationBody.lang).toBe("fr");

    // No attachment was chosen, so none may be uploaded.
    expect(posts.filter((p) => p.path.endsWith("/idea-attachments"))).toHaveLength(0);
  });
});
