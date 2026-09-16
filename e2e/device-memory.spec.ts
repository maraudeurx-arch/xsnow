import { expect, test } from "./helpers";

function stubSpeech() {
  return () => {
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
  };
}

test.describe("durable on-device memory", () => {
  test("reload keeps avatar, profile, and ideas for that visitor only", async ({ page }) => {
    const idea = `Déneiger les allées mémoire ${Date.now()}`;
    await page.addInitScript(() => {
      window.localStorage.setItem("xsnow.avatar", JSON.stringify("homme-blanc"));
      window.localStorage.setItem("xsnow.welcomePlayed", JSON.stringify(["homme-blanc"]));
      window.localStorage.setItem(
        "xsnow.localProfile",
        JSON.stringify({
          id: "OPC-7K3M",
          firstName: "Marie",
          lastName: "Tremblay",
          email: "marie@voisin.test",
          phone: "819-555-0100",
          createdAt: "2026-09-16T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        }),
      );
    });

    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");

    await page.goto("./vos-idees/");
    await page.getByRole("button", { name: "Vos idées" }).click();
    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: "Soumettre" }).click();
    await expect(page.getByText(idea).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText(idea).first()).toBeVisible();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");

    await page.goto("./mon-profil/");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC-7K3M/);
    await expect(page.getByText("Marie Tremblay")).toBeVisible();

    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.locator("[data-header-profile]")).not.toContainText("@");

    const stored = await page.evaluate(() => ({
      avatar: window.localStorage.getItem("xsnow.avatar"),
      profile: window.localStorage.getItem("xsnow.localProfile"),
      ideas: window.localStorage.getItem("xsnow.ideas"),
    }));
    expect(stored.avatar).toContain("homme-blanc");
    expect(stored.profile).toContain("OPC-7K3M");
    expect(stored.ideas).toContain(idea);
  });

  test("picking an avatar and saving a profile survives a full reload", async ({ page }) => {
    await page.addInitScript(stubSpeech());
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toBeVisible();
    await page.getByRole("button", { name: "Femme, peau foncée" }).click();
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);

    await page.goto("./mon-profil/");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await page.locator('input[name="firstName"]').fill("Marie");
    await page.locator('input[name="lastName"]').fill("Tremblay");
    await page.locator('input[name="email"]').fill("marie@voisin.test");
    await page.locator('input[name="phone"]').fill("819-555-0100");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC-/);

    await page.reload();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC-/);
    await expect(page.getByText("Marie Tremblay")).toBeVisible();

    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");

    const stored = await page.evaluate(() => ({
      avatar: window.localStorage.getItem("xsnow.avatar"),
      profile: window.localStorage.getItem("xsnow.localProfile"),
      welcome: window.localStorage.getItem("xsnow.welcomePlayed"),
      lang: window.localStorage.getItem("xsnow.lang"),
      geo: window.localStorage.getItem("xsnow.geoConsent"),
    }));
    expect(stored.avatar).toContain("femme-noire");
    expect(stored.profile).toContain("marie@voisin.test");
    expect(stored.welcome).toContain("femme-noire");
    expect(stored.geo).toContain("skipped");
  });
});
