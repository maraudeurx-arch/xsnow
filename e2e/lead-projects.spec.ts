import { expect, test, type Page } from "@playwright/test";
import { skipConsent, stubIdeaInbox } from "./helpers";

// « Mes projets » — espace de gestion des chefs de projet Clé en Main (07/11/2026).
// Tout le Worker est doublé : /arbitrage/me donne le statut du chef, le POST racine
// (clavardage Llama) répond une phrase fixe et capture le prompt système.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function seedProfile(page: Page, id: string, firstName: string, lastName: string) {
  await page.addInitScript(
    ([opcId, first, last]) => {
      try {
        window.localStorage.setItem(
          "xsnow.localProfile",
          JSON.stringify({
            id: opcId, firstName: first, lastName: last,
            email: "chef@voisin.test", phone: "819-555-0100",
            createdAt: "2026-11-04T12:00:00.000Z", updatedAt: "2026-11-04T12:00:00.000Z",
          }),
        );
      } catch { /* private mode */ }
    },
    [id, firstName, lastName] as const,
  );
}

async function seedLeadToken(page: Page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("opc.projectLead.token.v1", "tok-e2e"); } catch { /* private mode */ }
  });
}

const CHECKLIST_DONE = {
  items: ["terms", "identity", "face", "email", "notifications", "instructions", "approval"].map((id) => ({ id, done: true })),
  doneCount: 7,
  total: 7,
  complete: true,
  instructionsReadAt: "2026-11-04T22:07:10.000Z",
};

/** Double tout le Worker xsnow-chat. Renvoie la liste des corps POST du clavardage. */
async function stubWorker(page: Page, meStatus: string, chat: "ok" | "fail" = "ok") {
  const chatBodies: Array<{ system?: string; messages?: Array<{ role: string; content: string }> }> = [];
  const local = `${process.env.E2E_HOST || "127.0.0.1"}:${process.env.E2E_PORT || "4173"}`;
  // Filet : tout autre appel au Worker reçoit un 404 JSON, jamais le vrai service.
  await page.route((u) => u.host !== local && u.host.endsWith("workers.dev"), async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    return route.fulfill({ status: 404, headers: cors, json: { error: "e2e_stub_unhandled" } });
  });
  await page.route((u) => u.host !== local && u.pathname.includes("/arbitrage/"), async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/me")) {
      return route.fulfill({ headers: cors, json: { status: meStatus, role: "project_lead", hasEmail: true } });
    }
    if (path.endsWith("/checklist")) {
      return route.fulfill({ headers: cors, json: { ...CHECKLIST_DONE, status: meStatus } });
    }
    return route.fulfill({ status: 404, headers: cors, json: {} });
  });
  await page.route((u) => u.host !== local && u.host.endsWith("workers.dev") && u.pathname === "/", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    if (req.method() !== "POST") return route.fulfill({ status: 405, headers: cors, json: {} });
    chatBodies.push(req.postDataJSON() as (typeof chatBodies)[number]);
    if (chat === "fail") return route.fulfill({ status: 502, headers: cors, json: { error: "upstream" } });
    return route.fulfill({
      headers: cors,
      json: { reply: "Voici la prochaine étape : commence par le parcours d'accès (J1)." },
    });
  });
  return chatBodies;
}

test.describe("Mes projets — espace chef de projet", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await stubIdeaInbox(page);
  });

  test("Steve (OPC-5X78) voit son projet Éducation, l'ouvre et lit le cahier des charges", async ({ page }) => {
    await seedProfile(page, "OPC-5X78", "Steve", "Badinga");
    await seedLeadToken(page);
    await stubWorker(page, "verified");
    await page.goto("mes-projets/");
    const card = page.locator("[data-lead-project-card='education']");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Éducation");
    await expect(card).toContainText("CLE-PQ0ASQ");
    await card.click();
    const detail = page.locator("[data-lead-project-detail='education']");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("interface de classe");
    const spec = page.locator("[data-lead-project-spec]");
    await expect(spec).toContainText("Code de classe");
    await expect(spec).toContainText("Suggestions de l'IA au chef de projet");
    await expect(page.locator("[data-lead-project-step='current']")).toContainText("Validation du client");
  });

  test("Alex (OPC-UBNZ) voit Haute couture, cahier en préparation, et discute avec l'IA du projet", async ({ page }) => {
    await seedProfile(page, "OPC-UBNZ", "Alex", "Kumba");
    await seedLeadToken(page);
    const chatBodies = await stubWorker(page, "verified");
    await page.goto("mes-projets/");
    const card = page.locator("[data-lead-project-card='haute-couture']");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Haute couture");
    await card.click();
    await expect(page.locator("[data-lead-project-detail='haute-couture']")).toBeVisible();
    await expect(page.locator("[data-lead-project-spec]")).toContainText("en préparation");
    // Discussion : le message part au Worker avec le prompt du canal chef.
    await page.locator("[data-lead-chat-input]").fill("Par où je commence ?");
    await page.locator("[data-lead-chat-send]").click();
    await expect(page.locator("[data-lead-chat-msg='assistant']")).toContainText("parcours d'accès");
    await expect(page.locator("[data-lead-chat-msg='user']")).toContainText("Par où je commence ?");
    expect(chatBodies.length).toBe(1);
    expect(chatBodies[0]?.system).toContain("Haute couture");
    expect(chatBodies[0]?.system).toContain("Ne demande JAMAIS de secret");
    // Le fil est gardé sur l'appareil.
    const kept = await page.evaluate(() => window.localStorage.getItem("opc.leadProjects.thread.v1.OPC-UBNZ.haute-couture"));
    expect(kept).toContain("Par où je commence ?");
  });

  test("si l'IA ne répond pas, erreur honnête et aucun faux message de l'IA", async ({ page }) => {
    await seedProfile(page, "OPC-5X78", "Steve", "Badinga");
    await seedLeadToken(page);
    await stubWorker(page, "verified", "fail");
    await page.goto("mes-projets/");
    await page.locator("[data-lead-project-card='education']").click();
    await page.locator("[data-lead-chat-input]").fill("Quel est le prochain jalon ?");
    await page.locator("[data-lead-chat-send]").click();
    await expect(page.locator("[data-lead-chat-error]")).toBeVisible();
    await expect(page.locator("[data-lead-chat-msg='assistant']")).toHaveCount(0);
    await expect(page.locator("[data-lead-chat-msg='user']")).toContainText("prochain jalon");
  });

  test("chef validé sans projet rattaché : état vide propre", async ({ page }) => {
    await seedProfile(page, "OPC-7K3M", "Marie", "Tremblay");
    await seedLeadToken(page);
    await stubWorker(page, "verified");
    await page.goto("mes-projets/");
    await expect(page.locator("[data-lead-projects-empty]")).toBeVisible();
    await expect(page.locator("[data-lead-project-card]")).toHaveCount(0);
  });

  test("sans jeton de chef, la porte s'affiche et aucun projet n'est visible", async ({ page }) => {
    await seedProfile(page, "OPC-5X78", "Steve", "Badinga");
    await stubWorker(page, "verified");
    await page.goto("mes-projets/");
    const gate = page.locator("[data-lead-projects-gate='none']");
    await expect(gate).toBeVisible();
    await expect(page.locator("[data-lead-project-card]")).toHaveCount(0);
    await expect(page.locator("[data-lead-projects]")).not.toContainText("CLE-PQ0ASQ");
  });

  test("chef encore en validation : message d'attente, aucun projet", async ({ page }) => {
    await seedProfile(page, "OPC-5X78", "Steve", "Badinga");
    await seedLeadToken(page);
    await stubWorker(page, "pending");
    await page.goto("mes-projets/");
    await expect(page.locator("[data-lead-projects-gate='pending']")).toBeVisible();
    await expect(page.locator("[data-lead-project-card]")).toHaveCount(0);
  });

  test("le chef validé trouve « Ouvrir Mes projets » dans son parcours et y arrive", async ({ page }) => {
    await seedProfile(page, "OPC-5X78", "Steve", "Badinga");
    await seedLeadToken(page);
    await stubWorker(page, "verified");
    await page.goto("gagner-maintenant/");
    await page.locator("[data-earn-project-lead-cta]").click();
    const open = page.locator("[data-project-lead-projects-open]");
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/mes-projets\/?$/);
    await expect(page.locator("[data-lead-project-card='education']")).toBeVisible();
  });
});
