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

const SAMPLE_PROFILE = {
  id: "OPC-7K3M",
  firstName: "Marie",
  lastName: "Tremblay",
  email: "marie@voisin.test",
  phone: "819-555-0100",
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
};

test.describe("IndexedDB backup after empty localStorage", () => {
  test("restores avatar, Mes infos, and ideas when only IndexedDB still has them", async ({
    page,
  }) => {
    await page.addInitScript((profile) => {
      const idea = JSON.stringify([
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
      return new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("xsnow-device-memory", 1);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains("kv")) open.result.createObjectStore("kv");
        };
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("kv", "readwrite");
          const store = tx.objectStore("kv");
          store.put(JSON.stringify("homme-blanc"), "xsnow.avatar");
          store.put(JSON.stringify(["homme-blanc"]), "xsnow.welcomePlayed");
          store.put(JSON.stringify(profile), "xsnow.localProfile");
          store.put(idea, "xsnow.ideas");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      });
    }, SAMPLE_PROFILE);

    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-device-memory", "ready");
    await expect(page.getByText("Choisis ton avatar")).toHaveCount(0);
    await expect(page.locator("[data-header-profile]")).toHaveText("M.T.");
    await expect(page.getByRole("button", { name: "Réécouter" })).toBeVisible();

    const restored = await page.evaluate(() => ({
      avatar: window.localStorage.getItem("xsnow.avatar"),
      profile: window.localStorage.getItem("xsnow.localProfile"),
      ideas: window.localStorage.getItem("xsnow.ideas"),
    }));
    expect(restored.avatar).toContain("homme-blanc");
    expect(restored.profile).toContain("marie@voisin.test");
    expect(restored.ideas).toContain("Déneiger le stationnement");

    await page.goto("./mon-profil/");
    await expect(page.locator("[data-member-id]")).toHaveText(/Numéro OPC-7K3M/);
    await expect(page.getByText("Marie Tremblay")).toBeVisible();
    await expect(page.getByRole("button", { name: "S’inscrire" })).toHaveCount(0);
  });

  test("a later visit with wiped localStorage still shows the saved profile", async ({ page }) => {
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

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolve) => {
              const open = indexedDB.open("xsnow-device-memory", 1);
              open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains("kv")) {
                  db.close();
                  resolve(false);
                  return;
                }
                const req = db.transaction("kv", "readonly").objectStore("kv").get("xsnow.localProfile");
                req.onsuccess = () => {
                  const value = req.result;
                  db.close();
                  resolve(typeof value === "string" && value.includes("marie@voisin.test"));
                };
                req.onerror = () => {
                  db.close();
                  resolve(false);
                };
              };
              open.onerror = () => resolve(false);
            }),
        ),
      )
      .toBe(true);

    await page.evaluate(() => {
      window.localStorage.removeItem("xsnow.avatar");
      window.localStorage.removeItem("xsnow.localProfile");
      window.localStorage.removeItem("xsnow.welcomePlayed");
      window.localStorage.removeItem("xsnow.ideas");
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
  test("manifest start_url stays on the GitHub Pages app path", async ({ request }) => {
    const response = await request.get("/xsnow/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = (await response.json()) as {
      id?: string;
      start_url?: string;
      scope?: string;
      icons?: Array<{ src?: string }>;
    };
    expect(manifest.start_url).toBe("/xsnow/");
    expect(manifest.scope).toBe("/xsnow/");
    expect(manifest.id).toBe("/xsnow/");
    expect(manifest.icons?.[0]?.src).toContain("/xsnow/brand/");
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
