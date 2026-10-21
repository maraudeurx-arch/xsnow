import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

test.describe("HITL arbitrage", () => {
  test("Gagner maintenant links to Devenir arbitre; form shows privacy and consent", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.goto("gagner-maintenant/");
    await page.locator("[data-earn-arbiter-cta]").click();
    await expect(page).toHaveURL(/arbitrage\/?$/);
    await page.locator("[data-arb-become]").click();
    await page.locator("[data-arb-terms-accept]").click();
    await expect(page.locator("[data-arb-privacy]")).toBeVisible();
    await expect(page.locator("[data-arb-consent]")).not.toBeChecked();
    await expect(page.locator("[data-arb-submit]")).toBeDisabled();
  });

  test("explanation modal comes first, in order; Cancel closes it with no form", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.goto("arbitrage/");
    await expect(page.locator("[data-arb-form]")).toHaveCount(0);
    await page.locator("[data-arb-become]").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("[data-arb-form]")).toHaveCount(0);
    await expect(page.locator("[data-arb-terms] li")).toHaveCount(3);
    await expect(page.locator('[data-arb-terms-item="1"]')).toContainText("biométrique");
    await expect(page.locator('[data-arb-terms-item="2"]')).toContainText("250 $");
    await expect(page.locator('[data-arb-terms-item="3"]')).toContainText("30 $");
    await expect(page.locator('[data-arb-terms-item="3"]')).toContainText("50 $");
    await expect(page.locator("[data-arb-terms-accept]")).toHaveText("Accepter");
    // Whole modal on screen: title and point 1 not under the sticky header, buttons reachable.
    const vh = page.viewportSize()!.height;
    const title = await page.locator("#arb-terms-title").boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(0);
    const topEl = await page.evaluate(() => {
      const r = document.querySelector("#arb-terms-title")!.getBoundingClientRect();
      return document.elementFromPoint(r.left + 4, r.top + r.height / 2)?.closest("[data-arb-terms]") !== null;
    });
    expect(topEl).toBe(true);
    const box = await page.locator("[data-arb-terms]").boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 1);
    await page.locator("[data-arb-terms-cancel]").click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("[data-arb-form]")).toHaveCount(0);
    await expect(page.locator("[data-arb-become]")).toBeVisible();
    // Escape also cancels
    await page.locator("[data-arb-become]").click();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-arb-terms]")).toHaveCount(0);
    await expect(page.locator("[data-arb-form]")).toHaveCount(0);
  });

  test("Accepter starts the identity flow and the terms are sent with the application", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.goto("arbitrage/");
    await page.locator("[data-arb-become]").click();
    await page.locator("[data-arb-terms-accept]").click();
    await expect(page.locator("[data-arb-terms]")).toHaveCount(0);
    await expect(page.locator("[data-arb-form]")).toBeVisible();
    await expect(page.locator("[data-arb-email-input]")).toHaveAttribute("required", "");
    await expect(page.locator("[data-arb-become]")).toHaveCount(0);
  });

  test("verified arbiter accepts the AI suggestion", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    let decided: unknown = null;
    await page.route(/\/arbitrage\/(me|cases)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0 } });
      if (path.endsWith("/cases")) {
        return route.fulfill({ headers: cors, json: { cases: decided ? [] : [{
          caseId: "case_1", amountUsdc: 500, claimant: "agent-A", respondent: "agent-B",
          claim: "Service non livré", response: "Livré", suggestion: { outcome: "claimant", refundPercent: 100, rationale: "Pas de preuve.", model: "stub" },
        }] } });
      }
      if (path.endsWith("/cases/decide")) {
        decided = req.postDataJSON();
        return route.fulfill({ headers: cors, json: { ok: true } });
      }
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    await expect(page.locator('[data-arb-status="verified"]')).toBeVisible();
    await page.locator("[data-arb-accept]").click();
    await expect(page.getByText(/signée et envoyée/)).toBeVisible();
    expect(decided).toEqual({ caseId: "case_1", accept: true });
  });

  test("existing arbiter without email: 'Ajouter mon e-mail' saves it", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    let saved: unknown = null;
    await page.route(/\/arbitrage\/(me|cases|sim-cases|email)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0, hasEmail: false } });
      if (path.endsWith("/email")) { saved = req.postDataJSON(); return route.fulfill({ headers: cors, json: { ok: true, hasEmail: true } }); }
      if (path.endsWith("/sim-cases")) return route.fulfill({ headers: cors, json: { simulation: true, cases: [] } });
      if (path.endsWith("/cases")) return route.fulfill({ headers: cors, json: { cases: [] } });
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    const card = page.locator("[data-arb-email-card]");
    await expect(card).toContainText("Ajouter mon e-mail");
    // order: explanation, label, input, button
    const order = await card.evaluate((el) => [...el.querySelectorAll("p, label, input, button")].map((n) => n.getAttribute("data-arb-email-label") !== null ? "label" : n.tagName.toLowerCase()));
    expect(order.slice(0, 4)).toEqual(["p", "label", "input", "button"]);
    await expect(card.locator("[data-arb-email-label]")).toHaveText("Entre ton e-mail ici bas");
    // empty → focus the input + short hint, nothing sent
    await card.locator("[data-arb-email-save]").click();
    await expect(card.locator('[data-arb-email-error="empty"]')).toBeVisible();
    await expect(card.locator("[data-arb-email-field]")).toBeFocused();
    expect(saved).toBeNull();
    // invalid → visible message, nothing sent
    await card.locator("[data-arb-email-field]").fill("pas-un-email");
    await card.locator("[data-arb-email-save]").click();
    await expect(card.locator('[data-arb-email-error="invalid"]')).toBeVisible();
    expect(saved).toBeNull();
    // iOS autofill: value set without any input/change event, with capitals and a trailing space
    await card.locator("[data-arb-email-field]").evaluate((el) => { (el as HTMLInputElement).value = " Arbitre@OPC.test "; });
    await card.locator("[data-arb-email-save]").click();
    await expect(card).toHaveCount(0);
    expect(saved).toEqual({ email: "arbitre@opc.test", lang: "fr" });
  });

  test("red arbiter: banner with the training message, no real cases", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    await page.route(/\/arbitrage\/(me|cases|sim-cases)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0, hasEmail: true, red: true } });
      if (path.endsWith("/sim-cases")) return route.fulfill({ headers: cors, json: { simulation: true, cases: [] } });
      if (path.endsWith("/cases")) return route.fulfill({ status: 403, headers: cors, json: { error: "red_flag" } });
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    await expect(page.locator("[data-arb-red]")).toContainText("2 500 $");
    await expect(page.locator("[data-arb-red]")).toContainText("formation");
  });

  test("nothing pending: clean screen with empty state and the Manuel de justice card", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    await page.route(/\/arbitrage\/(me|cases|sim-cases)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0 } });
      if (path.endsWith("/sim-cases")) return route.fulfill({ headers: cors, json: { simulation: true, cases: [] } });
      if (path.endsWith("/cases")) return route.fulfill({ headers: cors, json: { cases: [] } });
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    await expect(page.locator("[data-arb-empty]")).toHaveText("Aucun arbitrage en attente.");
    const manual = page.locator("[data-arb-manual-standing]");
    await expect(manual).toBeVisible();
    await expect(manual.locator("[data-arb-manual-pdf]")).toHaveAttribute("href", "https://essaim-agents.com/manuel-justice-v2.3.2.pdf");
    await expect(page.locator("[data-arb-sim-case]")).toHaveCount(0);
  });

  test("verified arbiter answers a SIMULATION case with radio choices", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    let answered: unknown = null;
    await page.route(/\/arbitrage\/(me|cases|sim-cases)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0 } });
      if (path.endsWith("/sim-cases/answer")) {
        answered = req.postDataJSON();
        return route.fulfill({ headers: cors, json: { ok: true, simulation: true } });
      }
      if (path.endsWith("/sim-cases")) {
        return route.fulfill({ headers: cors, json: { simulation: true, cases: [{
          simulation: true, caseId: "sim_1", title: "SIMULATION — Fichier non livré", scenario: "L'agent A dit que B n'a pas livré.",
          choices: [{ id: "a", letter: "A", label: "Rembourser A" }, { id: "b", letter: "B", label: "Donner raison à B" }, { id: "c", letter: "C", label: "Partager" }], myAnswer: null,
          suggestion: { letter: "B", text: "Je suggère B.", reasoning: "M-5.3 charge.", author: "Indiana" },
        }] } });
      }
      if (path.endsWith("/cases")) return route.fulfill({ headers: cors, json: { cases: [] } });
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    const card = page.locator('[data-arb-sim-case="sim_1"]');
    await expect(card.locator("[data-arb-sim-banner]")).toContainText("SIMULATION");
    await expect(page.locator("[data-arb-notify]")).toContainText("notifications");
    // iPhone-sized project may use an iOS UA (→ Home Screen hint) or lack PushManager (→ unsupported)
    await expect(page.locator("[data-arb-notify-enable], [data-arb-notify-ios], [data-arb-notify-unsupported]").first()).toBeVisible();
    await expect(card.locator('input[type="radio"]')).toHaveCount(3);
    await expect(card.locator("[data-arb-sim-letter]")).toHaveText(["A.", "B.", "C."]);
    await expect(card.locator("[data-arb-sim-suggestion]")).toContainText("Suggestion d’Indiana : B");
    await expect(card.locator("[data-arb-sim-suggestion]")).toContainText("M-5.3");
    await expect(card.locator("[data-arb-sim-send]")).toBeDisabled();
    await expect(card).not.toContainText(/tribunal|\bcour\b/i);
    await card.locator('[data-arb-sim-choice="b"]').check();
    await card.locator("[data-arb-sim-send]").click();
    await expect(card.locator("[data-arb-sim-done]")).toContainText("B. Donner raison à B");
    expect(answered).toEqual({ caseId: "sim_1", choiceId: "b" });
    const manual = card.locator("[data-arb-sim-manual]");
    await expect(manual).toBeVisible();
    await expect(manual.locator("[data-arb-manual-pdf]")).toHaveAttribute("href", "https://essaim-agents.com/manuel-justice-v2.3.2.pdf");
    await expect(manual.locator("[data-arb-manual-page]")).toHaveAttribute("href", "https://essaim-agents.com/manuel-justice");
  });

  test("rescan requested: clear message and only the face scan (no identity form)", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    let sent: unknown = null;
    const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await page.route(/\/arbitrage\/(me|rescan)/, async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname;
      if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: sent ? "pending" : "rescan_requested", arbiterId: "arb_1", reputation: 0 } });
      if (path.endsWith("/rescan/photo")) return route.fulfill({ headers: cors, json: { mime: "image/png", base64: png } });
      if (path.endsWith("/rescan")) { sent = req.postDataJSON(); return route.fulfill({ headers: cors, json: { ok: true, status: "pending" } }); }
      return route.fulfill({ status: 404, headers: cors, json: {} });
    });
    await page.goto("arbitrage/");
    await expect(page.locator('[data-arb-status="rescan_requested"]')).toContainText("Nouveau scan du visage");
    await expect(page.locator("[data-arb-form]")).toHaveCount(0);
    await expect(page.locator("[data-arb-become]")).toHaveCount(0);
    await expect(page.locator("[data-arb-face-start]")).toBeEnabled();
    await expect(page.locator("[data-arb-rescan-send]")).toBeDisabled();
    // the camera element keeps playsinline for iOS Safari
    await expect(page.locator("[data-arb-rescan] [data-arb-face-video]")).toHaveAttribute("playsinline", "");
  });
});

