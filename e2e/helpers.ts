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

/** Never POST e2e ideas/registrations to the production Worker (no live email). */
export async function stubIdeaInbox(
  page: Page,
  inbox: "sent" | "failed" = "sent",
  options: { delayMs?: number } = {},
) {
  const delayMs = options.delayMs ?? 0;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  await page.route(/\/(ideas|register)(\?|$)/, async (route) => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (method === "POST") {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const emailed = inbox === "sent";
      await route.fulfill({
        status: emailed ? 200 : 503,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify(
          emailed
            ? { ok: true, persisted: path.endsWith("/ideas"), emailed: true }
            : { error: "mail_failed" },
        ),
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
