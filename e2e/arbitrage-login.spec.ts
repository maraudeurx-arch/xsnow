import { expect, test } from "@playwright/test";
import { skipConsent } from "./helpers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

test.describe("arbiter email login (home-screen app, no local profile)", () => {
  test("existing arbiter gets a code by email and finds the profile without signing up again", async ({ page }) => {
    await skipConsent(page);
    const calls: string[] = [];
    const local = `${process.env.E2E_HOST || "127.0.0.1"}:${process.env.E2E_PORT || "4173"}`;
    await page.route((u) => u.host !== local && u.pathname.includes("/arbitrage/"), async (route) => {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(req.url()).pathname.replace(/^.*\/arbitrage/, "");
      const auth = req.headers()["authorization"] ?? "";
      calls.push(`${req.method()} ${path} ${auth ? "auth" : ""} ${req.postData() ?? ""}`.trim());
      if (path === "/login/request") return route.fulfill({ headers: cors, json: { ok: true } });
      if (path === "/login/verify") {
        const b = JSON.parse(req.postData() ?? "{}");
        return b.code === "123456" ? route.fulfill({ headers: cors, json: { ok: true, token: "tok-new-device", status: "pending" } })
          : route.fulfill({ status: 400, headers: cors, json: { error: "invalid_code" } });
      }
      if (path === "/me") return route.fulfill({ headers: cors, json: { status: "pending", arbiterId: "arb_1", reputation: 0, hasEmail: true } });
      if (path === "/checklist") return route.fulfill({ headers: cors, json: { ok: true, status: "pending", items: [{ id: "email", done: true }], doneCount: 1, total: 6, complete: false } });
      return route.fulfill({ status: 403, headers: cors, json: { error: "not_verified" } });
    });
    await page.goto("arbitrage/");
    await page.locator("[data-arb-login-open]").click();
    const card = page.locator("[data-arb-login]");
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(/tribunal|\bcour\b|\bcourt\b/i);
    await card.locator("[data-arb-login-email]").fill("Arbitre@OPC.test");
    await card.locator("[data-arb-login-send]").click();
    await expect(card.locator('[data-arb-login-msg="sent"]')).toBeVisible();
    await card.locator("[data-arb-login-code]").fill("000000");
    await card.locator("[data-arb-login-verify]").click();
    await expect(card.locator('[data-arb-login-msg="invalid"]')).toBeVisible();
    await card.locator("[data-arb-login-code]").fill("123456");
    await card.locator("[data-arb-login-verify]").click();
    await expect(page.locator('[data-arb-status="pending"]')).toBeVisible();
    await expect(page.locator("[data-arb-checklist]")).toBeVisible();
    await expect(page.locator("[data-arb-login]")).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem("opc.arbiter.token.v1"))).toBe("tok-new-device");
    expect(calls.some((c) => c.startsWith("POST /login/request") && c.includes("arbitre@opc.test"))).toBe(true);
    expect(calls.some((c) => c.startsWith("GET /me auth"))).toBe(true);
  });
});
