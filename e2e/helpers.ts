import { test as base, expect, type Page } from "@playwright/test";

/** Skip the first-visit consent sheet without granting GPS or analytics. */
export async function skipConsent(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("xsnow.geoConsent", JSON.stringify("skipped"));
      window.localStorage.setItem("xsnow.analyticsConsent", JSON.stringify("denied"));
    } catch {
      // Private mode — the suite still tries the UI skip buttons.
    }
  });
}

/** Never POST e2e ideas to the production Worker inbox. */
export async function stubIdeaInbox(page: Page, inbox: "sent" | "failed" = "sent") {
  await page.route(/\/ideas(\?|$)/, async (route) => {
    const method = route.request().method();
    if (method === "OPTIONS") {
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
    if (method === "POST") {
      await route.fulfill({
        status: inbox === "sent" ? 200 : 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(inbox === "sent" ? { ok: true, persisted: true } : { error: "store_failed" }),
      });
      return;
    }
    await route.continue();
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await skipConsent(page);
    await stubIdeaInbox(page);
    await use(page);
  },
});

export { expect };
