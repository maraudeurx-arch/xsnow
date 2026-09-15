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

export const test = base.extend({
  page: async ({ page }, use) => {
    await skipConsent(page);
    await use(page);
  },
});

export { expect };
