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

/** Device-local OPC profile so gated boards (Vos idées, Gagner maintenant) open. */
export async function seedLocalProfile(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "xsnow.localProfile",
        JSON.stringify({
          id: "OPC-7K3M",
          firstName: "Marie",
          lastName: "Tremblay",
          email: "marie@voisin.test",
          phone: "819-555-0100",
          createdAt: "2026-09-17T12:00:00.000Z",
          updatedAt: "2026-09-17T12:00:00.000Z",
        }),
      );
    } catch {
      // Private mode
    }
  });
}

/** Never POST e2e ideas/registrations/alerts to the production Worker. */
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

  await page.route(/\/(ideas|register|alerts(?:\/consent|\/ping)?)(\?|$)/, async (route) => {
    const method = route.request().method();
    const path = new URL(route.request().url()).pathname;
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (method === "POST") {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const emailed = inbox === "sent";
      const isAlert = path.includes("/alerts");
      await route.fulfill({
        status: emailed ? 200 : 503,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify(
          emailed
            ? isAlert
              ? {
                  ok: true,
                  persisted: false,
                  scheduled: true,
                  outside: false,
                  distanceKm: 0.2,
                  sms: { sent: false, reason: "not_configured" },
                  email: { sent: false, reason: "not_configured" },
                  consent: "granted",
                }
              : { ok: true, persisted: path.endsWith("/ideas"), emailed: true }
            : { error: "mail_failed" },
        ),
      });
      return;
    }
    if (method === "GET" && path.includes("/alerts")) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: cors,
        body: JSON.stringify({ error: "not_found" }),
      });
      return;
    }
    // Never fall through to the production Worker for these endpoints.
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      headers: cors,
      body: JSON.stringify({ error: "e2e_stub_unhandled" }),
    });
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
