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
});
