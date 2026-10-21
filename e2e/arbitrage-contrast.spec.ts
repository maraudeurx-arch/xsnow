import { expect, test, type Page } from "@playwright/test";
import { seedLocalProfile, skipConsent } from "./helpers";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function mockVerifiedWithSim(page: Page) {
  await skipConsent(page);
  await seedLocalProfile(page);
  await page.addInitScript(() => window.localStorage.setItem("opc.arbiter.token.v1", "tok-e2e"));
  await page.route(/\/arbitrage\/(me|cases|sim-cases)/, async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = new URL(req.url()).pathname;
    if (path.endsWith("/me")) return route.fulfill({ headers: cors, json: { status: "verified", arbiterId: "arb_1", reputation: 0 } });
    if (path.endsWith("/sim-cases")) {
      return route.fulfill({ headers: cors, json: { simulation: true, cases: [{
        simulation: true, caseId: "sim_1", title: "SIMULATION — Traduction livrée en retard et incomplète",
        scenario: "L'agent Alpha (client) a commandé à l'agent Bêta la traduction en anglais d'un guide de 20 pages, pour un montant fictif de deux cents dollars.",
        choices: [{ id: "a", label: "Rembourser Alpha en totalité" }, { id: "b", label: "Donner raison à Bêta : paiement complet" }, { id: "c", label: "Partager : Bêta traduit les légendes et reçoit la moitié du montant" }], myAnswer: null,
      }] } });
    }
    if (path.endsWith("/cases")) {
      return route.fulfill({ headers: cors, json: { cases: [{
        caseId: "case_1", amountUsdc: 500, claimant: "agent-A", respondent: "agent-B",
        claim: "Service non livré", response: "Livré", suggestion: { outcome: "claimant", refundPercent: 100, rationale: "Pas de preuve.", model: "stub" },
      }] } });
    }
    return route.fulfill({ status: 404, headers: cors, json: {} });
  });
}

/** WCAG contrast of each element's text against its own computed backing (walks up to the first opaque-ish background). */
async function contrasts(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) => {
    // Normalise any CSS color (oklch, color-mix…) to sRGB through a canvas.
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true })!;
    const parse = (c: string) => {
      cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: Math.round((d[3] / 255) * 100) / 100 };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    return els.map((el) => {
      const cs = getComputedStyle(el);
      const fg = parse(cs.webkitTextFillColor && cs.webkitTextFillColor !== "currentcolor" ? cs.webkitTextFillColor : cs.color);
      let n: Element | null = el; let bg = { r: 0, g: 0, b: 0, a: 0 }; let opacity = 1;
      for (let p: Element | null = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
      while (n) { const b = parse(getComputedStyle(n).backgroundColor); if (b.a >= 0.85) { bg = b; break; } n = n.parentElement; }
      const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      return { text: (el.textContent || "").slice(0, 30), ratio: Math.round(ratio * 10) / 10, fgAlpha: fg.a, opacity, bgAlpha: bg.a };
    });
  });
}

test.describe("arbitrage readability (iPhone)", () => {
  test("simulation and case cards: opaque backing, opaque text, WCAG AA", async ({ page }) => {
    await mockVerifiedWithSim(page);
    await page.goto("arbitrage/");
    const card = page.locator('[data-arb-sim-case="sim_1"]');
    await expect(card).toBeVisible();
    const sel = '[data-arb-sim-case] :is(h3, p, span, label), [data-arb-case] :is(p, b)';
    const res = await contrasts(page, sel);
    expect(res.length).toBeGreaterThan(5);
    for (const r of res) {
      expect(r.bgAlpha, `backing for "${r.text}"`).toBeGreaterThanOrEqual(0.85);
      expect(r.fgAlpha, `text alpha "${r.text}"`).toBe(1);
      expect(r.opacity, `opacity "${r.text}"`).toBe(1);
      expect(r.ratio, `contrast "${r.text}"`).toBeGreaterThanOrEqual(4.5);
    }
    if (process.env.ARB_SHOT) {
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: process.env.ARB_SHOT, fullPage: false });
      await card.screenshot({ path: process.env.ARB_SHOT.replace(/\.png$/, "_card.png") });
    }
  });

  test("footer links do not overlap the sticky slogan layer", async ({ page }) => {
    await mockVerifiedWithSim(page);
    await page.goto("arbitrage/");
    await expect(page.locator('[data-arb-sim-case="sim_1"]')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const overlap = await page.evaluate(() => {
      const slogan = document.querySelector("footer .footer-slogan-line")!.getBoundingClientRect();
      return [...document.querySelectorAll("footer a")]
        .map((a) => ({ t: (a.textContent || "").trim(), r: a.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.top < slogan.bottom - 0.5)
        .map(({ t }) => t);
    });
    expect(overlap).toEqual([]);
  });
});
