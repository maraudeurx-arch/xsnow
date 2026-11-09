import { expect, type Page } from "@playwright/test";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type BankMode = "ok" | "not-configured";

export async function stubBank(page: Page, mode: BankMode, calls: string[]) {
  await page.route(/\/(persona-deposits|twin-bank)(\/[a-z]+)?(\?|$)/, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push(`${req.method()} ${path}`);
    if (mode === "not-configured") {
      return route.fulfill({ status: 503, headers: cors, contentType: "application/json", body: JSON.stringify({ error: "storage_not_configured" }) });
    }
    let body: unknown = { ok: true };
    if (path.endsWith("/persona-deposits")) body = { ok: true, accepted: true, id: "x", status: "pending_review", withdrawToken: "t".repeat(43) };
    if (path.endsWith("/withdraw")) body = { ok: true, status: "revoked", deleted: 2 };
    if (path.endsWith("/twin-bank")) body = { ok: true, items: [{ id: "persona-abc-1234", pseudonym: "Joase", country: "Haïti", kinds: ["voice", "image"], verified: false }], pricing: { perItemPerMonthCadCents: 300, liveBilling: false } };
    if (path.endsWith("/use")) body = { ok: true, testMode: true, charged: false, alreadyCountedThisMonth: false, month: "2026-11", monthTotalCadCents: 300, lines: 1, media: null };
    if (path.endsWith("/usage")) body = { ok: true, testMode: true, month: "2026-11", lines: [{ itemId: "persona-abc-1234", kind: "voice", amountCadCents: 300 }], totalCadCents: 300 };
    return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
  });
}

export async function voiceOnlyToBiometry(page: Page) {
  await page.goto("monetise/");
  const next = page.locator("[data-persona-step=choice] [data-persona-next]");
  await expect(next).toBeDisabled();
  await page.locator('[data-persona-offer="voice"]').check();
  await page.locator("[data-persona-pseudonym]").fill("Joase");
  await page.locator("[data-persona-country]").fill("Haïti");
  await next.click();

  const consentNext = page.locator("[data-persona-step=consent] [data-persona-next]");
  await expect(page.locator("[data-persona-step=consent]")).toContainText("Retrait en tout temps");
  for (const k of ["terms", "adult", "compensation"]) await page.locator(`[data-persona-consent-check="${k}"]`).check();
  await expect(consentNext).toBeDisabled(); // own voice/image box still unticked
  await page.locator('[data-persona-consent-check="selfOnly"]').check();
  await consentNext.click();
  await expect(page.locator("[data-persona-step=voice]")).toBeVisible();
}

