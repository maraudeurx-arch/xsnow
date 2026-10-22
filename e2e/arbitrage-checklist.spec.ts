import { expect, test, type Page } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const items = (done: Record<string, boolean>, walletState = "missing") => ["email", "notifications", "wallet", "face", "test_case", "manual"].map((id) =>
  id === "wallet" ? { id, done: !!done[id], state: done[id] ? "done" : walletState } : { id, done: !!done[id] });

function checklist(done: Record<string, boolean>, walletState?: string) {
  const list = items(done, walletState);
  const n = list.filter((x) => x.done).length;
  return { ok: true, status: "verified", items: list, doneCount: n, total: 6, complete: n === 6 };
}

/** Everything under /arbitrage/* is stubbed: nothing reaches the production Worker. */
async function stubArbiter(page: Page, status: string, initial: Record<string, boolean>, walletState?: string) {
  const calls: string[] = [];
  let state = { ...initial };
  const local = `${process.env.E2E_HOST || "127.0.0.1"}:${process.env.E2E_PORT || "4173"}`;
  await page.route((u) => u.host !== local && u.pathname.includes("/arbitrage/"), async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(req.url()).pathname;
    calls.push(`${req.method()} ${path.replace(/^.*\/arbitrage/, "")}`);
    if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status, arbiterId: "arb_1", reputation: 0, hasEmail: !!state.email } });
    if (path.endsWith("/checklist")) return route.fulfill({ headers: cors, json: { ...checklist(state, walletState), status } });
    if (path.endsWith("/manual-read")) { state = { ...state, manual: true }; return route.fulfill({ headers: cors, json: { ...checklist(state, walletState), status } }); }
    if (path.endsWith("/sim-cases")) return route.fulfill({ headers: cors, json: { simulation: true, cases: [] } });
    if (path.endsWith("/cases")) return route.fulfill({ headers: cors, json: { cases: [] } });
    if (path.endsWith("/wallet")) return route.fulfill({ headers: cors, json: { address: null, needsWallet: false } });
    return route.fulfill({ status: 404, headers: cors, json: {} });
  });
  return calls;
}

test.describe("arbiter onboarding checklist", () => {
  test("verified arbiter sees done/missing items with simple steps, and can mark the Manuel as read", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    const calls = await stubArbiter(page, "verified", { email: true, face: true, test_case: true }, "wrong_chain");
    await page.goto("arbitrage/");
    const card = page.locator("[data-arb-checklist]");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Ta liste pour devenir arbitre");
    await expect(card).toContainText("Indiana");
    await expect(card.locator("[data-arb-checklist-progress]")).toHaveText("3 sur 6 faits");
    await expect(card.locator("[data-arb-checklist-item]")).toHaveCount(6);
    for (const id of ["email", "face", "test_case"]) await expect(card.locator(`[data-arb-checklist-item="${id}"]`)).toHaveAttribute("data-arb-checklist-state", "done");
    for (const id of ["notifications", "wallet", "manual"]) {
      const item = card.locator(`[data-arb-checklist-item="${id}"]`);
      await expect(item).toHaveAttribute("data-arb-checklist-state", "missing");
      await expect(item.locator("[data-arb-checklist-steps] li").first()).toBeVisible();
    }
    await expect(card.locator('[data-arb-checklist-item="wallet"]')).toContainText("Base Sepolia");
    await expect(card.locator("[data-arb-checklist-wrong-chain]")).toBeVisible();
    await expect(card.locator("[data-arb-checklist-manual-link]")).toHaveAttribute("href", "https://essaim-agents.com/manuel-justice");
    await expect(card).not.toContainText(/tribunal|\bcour\b|\bcourt\b/i);
    await card.locator("[data-arb-checklist-manual-read]").click();
    await expect(card.locator('[data-arb-checklist-item="manual"]')).toHaveAttribute("data-arb-checklist-state", "done");
    await expect(card.locator("[data-arb-checklist-progress]")).toHaveText("4 sur 6 faits");
    expect(calls).toContain("POST /manual-read");
  });

  test("pending arbiter: checklist is shown, wallet waits for the verification", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    await stubArbiter(page, "pending", { email: true, face: true });
    await page.goto("arbitrage/");
    const card = page.locator("[data-arb-checklist]");
    await expect(card.locator("[data-arb-checklist-progress]")).toHaveText("2 sur 6 faits");
    await expect(card.locator('[data-arb-checklist-item="wallet"]')).toContainText("dès que ta demande sera vérifiée");
    await expect(card.locator("[data-arb-checklist-wallet]")).toHaveCount(0);
  });

  test("complete arbiter: all items done, encouraging message", async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
    await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
    await stubArbiter(page, "verified", { email: true, notifications: true, wallet: true, face: true, test_case: true, manual: true });
    await page.goto("arbitrage/");
    const card = page.locator("[data-arb-checklist]");
    await expect(card.locator('[data-arb-checklist-state="done"]')).toHaveCount(6);
    await expect(card.locator("[data-arb-checklist-cheer]")).toContainText("Bravo");
  });
});
