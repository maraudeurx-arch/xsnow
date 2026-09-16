import { expect, test as fresh } from "@playwright/test";
import { APP_VERSION } from "../src/lib/app-version";
import { OPC_PUBLIC_EMAIL } from "../src/lib/paths";

fresh.describe("new visitor onboarding order", () => {
  fresh("shows the four avatars before geo, then geo after a choice", async ({ page }) => {
    await page.addInitScript(() => {
      const fake = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null as ((this: SpeechSynthesis, ev: Event) => void) | null,
        getVoices() {
          return [];
        },
        speak(utter: SpeechSynthesisUtterance) {
          this.speaking = true;
          this.pending = false;
          window.setTimeout(() => {
            utter.onstart?.(new Event("start") as SpeechSynthesisEvent);
            window.setTimeout(() => {
              this.speaking = false;
              utter.onend?.(new Event("end") as SpeechSynthesisEvent);
            }, 40);
          }, 20);
        },
        cancel() {
          this.speaking = false;
          this.pending = false;
        },
        pause() {},
        resume() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return true;
        },
      };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: fake });
    });

    await page.goto("./");
    await expect(page.getByRole("heading", { name: "Open Community", level: 1 })).toBeVisible();
    await expect(page.getByText("Choisis ton avatar")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Position — optionnelle")).toHaveCount(0);
    await expect(page.locator(".avatar-disc")).toHaveCount(4);

    await page.getByRole("button", { name: "Homme, peau claire" }).click();

    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Position — optionnelle")).toBeVisible();
    await expect(page.getByRole("button", { name: "Oui" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Non —/ })).toBeVisible();
  });

  fresh("returning visitor with avatar and geo choice skips picker and geo sheet", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
      window.localStorage.setItem("xsnow.geoConsent", JSON.stringify("skipped"));
      window.localStorage.setItem("xsnow.analyticsConsent", JSON.stringify("denied"));
    });

    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.getByText("Position — optionnelle")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Compris" })).toHaveCount(0);
    await expect(page.getByRole("note")).toHaveCount(0);
  });

  fresh("lets a new visitor read About version and contact without geo", async ({ page }) => {
    const version = new RegExp(`Version ${APP_VERSION.replaceAll(".", "\\.")}`);
    await page.goto("./about/");
    await expect(page.getByRole("heading", { name: "Qui est derrière OPC" })).toBeVisible();
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Position — optionnelle")).toHaveCount(0);
    await expect(page.getByText(version)).toBeVisible();
    await expect(page.getByRole("link", { name: OPC_PUBLIC_EMAIL })).toBeVisible();
  });
});
