import { devices } from "@playwright/test";
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
    await page.getByLabel("Ton idée").fill(idea);
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();
    const ideasStored = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(ideasStored).toContain(idea);

    await page.reload();
    const ideasAfterReload = await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"));
    expect(ideasAfterReload).toContain(idea);
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

  test("pageshow resume does not wipe xsnow keys or show the avatar picker", async ({ page }) => {
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
      window.localStorage.setItem(
        "xsnow.ideas",
        JSON.stringify([{ id: "idea-1", text: "Déneiger", involvement: ["mains"], hoursPerWeek: "1", neighborhood: "Hull", createdAt: "2026-09-16T00:00:00.000Z", updatedAt: "2026-09-16T00:00:00.000Z" }]),
      );
    });
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    const keys = await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.startsWith("xsnow.")).sort(),
    );
    expect(keys).toEqual(expect.arrayContaining(["xsnow.avatar", "xsnow.localProfile", "xsnow.ideas"]));
    expect(await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"))).toContain("Déneiger");
  });
});

test.describe("Android Chrome installed-app memory", () => {
  test.use({
    userAgent: devices["Pixel 5"].userAgent,
    viewport: devices["Pixel 5"].viewport,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2.625,
  });

  test("reload keeps avatar, profile, and ideas", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("xsnow.avatar", JSON.stringify("femme-noire"));
      window.localStorage.setItem("xsnow.welcomePlayed", JSON.stringify(["femme-noire"]));
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
    await page.goto("./vos-idees/");
    await page.getByLabel("Ton idée").fill("Co-voiturage du matin");
    await page.getByRole("button", { name: "Envoyer l’idée" }).click();
    await page.reload();
    expect(await page.evaluate(() => window.localStorage.getItem("xsnow.ideas"))).toContain("Co-voiturage du matin");
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
  });
});

const PROFILE_JSON = JSON.stringify({
  id: "OPC-7K3M",
  firstName: "Marie",
  lastName: "Tremblay",
  email: "marie@voisin.test",
  phone: "819-555-0100",
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
});

test.describe("iOS empty-localStorage cold start", () => {
  test("IndexedDB backup restores avatar, Mes infos, and ideas when localStorage is empty", async ({ page }) => {
    await page.addInitScript(async (profile) => {
      const ideas = JSON.stringify([
        {
          id: "idea-1",
          text: "Déneiger le stationnement",
          involvement: ["mains"],
          hoursPerWeek: "1",
          neighborhood: "Hull",
          createdAt: "2026-09-16T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        },
      ]);
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("xsnow-device-memory", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        };
        req.onerror = () => reject(req.error ?? new Error("idb"));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("kv", "readwrite");
          const store = tx.objectStore("kv");
          store.put(JSON.stringify("homme-blanc"), "xsnow.avatar");
          store.put(JSON.stringify(["homme-blanc"]), "xsnow.welcomePlayed");
          store.put(profile, "xsnow.localProfile");
          store.put(ideas, "xsnow.ideas");
          store.put(JSON.stringify("skipped"), "xsnow.geoConsent");
          store.put(JSON.stringify("denied"), "xsnow.analyticsConsent");
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("idb tx"));
        };
      });
    }, PROFILE_JSON);

    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-device-memory", "ready");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();

    const restored = await page.evaluate(() => ({
      avatar: window.localStorage.getItem("xsnow.avatar"),
      profile: window.localStorage.getItem("xsnow.localProfile"),
      ideas: window.localStorage.getItem("xsnow.ideas"),
      geo: window.localStorage.getItem("xsnow.geoConsent"),
      analytics: window.localStorage.getItem("xsnow.analyticsConsent"),
    }));
    expect(restored.avatar).toContain("homme-blanc");
    expect(restored.profile).toContain("marie@voisin.test");
    expect(restored.ideas).toContain("Déneiger le stationnement");
    expect(restored.geo).toContain("skipped");
    expect(restored.analytics).toContain("denied");

    await page.goto("./mon-profil/");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC/);
    await expect(page.getByText("Marie Tremblay")).toBeVisible();
    await expect(page.getByRole("button", { name: "S’inscrire" })).toHaveCount(0);
  });

  test("saving a profile then wiping localStorage still restores after reload", async ({ page }) => {
    await page.addInitScript(stubSpeech());
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toBeVisible();
    await page.getByRole("button", { name: "Femme, peau foncée" }).click();
    await page.goto("./mon-profil/");
    await page.getByRole("button", { name: "S’inscrire" }).click();
    await page.locator('input[name="firstName"]').fill("Marie");
    await page.locator('input[name="lastName"]').fill("Tremblay");
    await page.locator('input[name="email"]').fill("marie@voisin.test");
    await page.locator('input[name="phone"]').fill("819-555-0100");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");

    await page.waitForFunction(async () => {
      try {
        const value = await new Promise<string | null>((resolve, reject) => {
          const req = indexedDB.open("xsnow-device-memory", 1);
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains("kv")) {
              resolve(null);
              return;
            }
            const get = db.transaction("kv", "readonly").objectStore("kv").get("xsnow.localProfile");
            get.onsuccess = () => resolve(typeof get.result === "string" ? get.result : null);
            get.onerror = () => reject(get.error);
          };
        });
        return Boolean(value && value.includes("marie@voisin.test"));
      } catch {
        return false;
      }
    });

    await page.evaluate(() => {
      const keys = Object.keys(window.localStorage).filter((key) => key.startsWith("xsnow."));
      for (const key of keys) window.localStorage.removeItem(key);
      window.sessionStorage.clear();
    });

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-device-memory", "ready");
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC-/);
    await expect(page.getByText("Marie Tremblay")).toBeVisible();
    await page.goto("./");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
  });
});

test.describe("PWA launch URL", () => {
  test("manifest start_url stays under /xsnow/", async ({ request }) => {
    const response = await request.get("./manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { start_url?: string; scope?: string; id?: string; icons?: { src?: string }[] };
    expect(body.start_url).toBe("https://maraudeurx-arch.github.io/xsnow/");
    expect(body.scope).toBe("https://maraudeurx-arch.github.io/xsnow/");
    expect(body.id).toBe("https://maraudeurx-arch.github.io/xsnow/");
    expect(body.start_url).not.toBe("/");
    expect(body.start_url).not.toBe("/xsnow/");
    expect(body.start_url).not.toMatch(/\/xsnow\/xsnow/);
    expect(body.icons?.[0]?.src).toBe("https://maraudeurx-arch.github.io/xsnow/brand/app-icon-192.png");
  });
});
