import { expect, test } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";
import { stubBank, voiceOnlyToBiometry } from "./persona-bank-helpers";

// Full deposit with Chromium's fake microphone; bank routes stubbed, then unrouteAll.
test.use({
  permissions: ["microphone", "camera"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

test.describe("Monétise-toi — dépôt complet (micro simulé) puis retrait", () => {
  test.beforeEach(async ({ page }) => {
    await skipConsent(page);
    await seedLocalProfile(page);
  });
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("records a voice, shows the code phrase, deposits to the bank and withdraws with real deletion", async ({ page }) => {
    const calls: string[] = [];
    await stubBank(page, "ok", calls);
    await voiceOnlyToBiometry(page);
    await page.locator("[data-persona-voice-record]").click();
    await expect(page.locator("[data-persona-voice-recording]")).toBeVisible();
    await page.waitForTimeout(1200);
    await page.locator("[data-persona-voice-stop]").click();
    await expect(page.locator("[data-persona-voice-preview]")).toBeVisible();
    await page.locator("[data-persona-step=voice] [data-persona-next]").click();

    const phrase = page.locator("[data-persona-liveness-phrase]");
    await expect(phrase).toContainText("Je suis Joase");
    await expect(phrase).toHaveText(/Mon code : [0-9]{6}\./);
    await page.locator('input[data-persona-file="selfie"]').setInputFiles({
      name: "selfie.webm",
      mimeType: "video/webm",
      buffer: Buffer.from("fake-selfie-video"),
    });
    await expect(page.locator("[data-persona-file-note=selfie]")).toContainText("enregistré");
    await page.locator("[data-persona-finish]").click();
    await expect(page.locator("[data-persona-step=done]")).toBeVisible();
    await expect(page.locator("[data-persona-upload-note]")).toHaveAttribute("data-persona-upload", "sent");
    expect(calls).toContain("POST /persona-deposits");

    await page.locator("[data-persona-withdraw-button]").click();
    await page.locator("[data-persona-withdraw-confirm]").click();
    await expect(page.locator("[data-persona-withdraw-note]")).toContainText("retirées et effacées");
    expect(calls).toContain("POST /persona-deposits/withdraw");
  });
});
