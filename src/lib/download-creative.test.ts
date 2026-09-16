import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  downloadCreativeImage,
  isAppleWebkitMobile,
  mimeFromFilename,
  type CreativeDownloadAnchor,
} from "./download-creative.ts";
import { filenameFromImagePath, partnerCreativeDownloadName } from "./partner-ads.ts";

describe("creative download names", () => {
  it("keeps the published file name and sanitizes odd paths", () => {
    assert.equal(filenameFromImagePath("/partners/coop.svg"), "coop.svg");
    assert.equal(filenameFromImagePath("/partners/atelier.svg"), "atelier.svg");
    assert.equal(
      filenameFromImagePath("https://cdn.example/ads/chat-perdu.png?v=2"),
      "chat-perdu.png",
    );
    assert.equal(filenameFromImagePath("/partners/weird name!!.png"), "weird-name-.png");
    assert.equal(filenameFromImagePath(""), null);
    assert.equal(
      partnerCreativeDownloadName({
        id: "placeholder-coop",
        kind: "register",
        href: "/mon-profil",
        imagePath: "/partners/coop.svg",
      }),
      "coop.svg",
    );
    assert.equal(
      partnerCreativeDownloadName({
        id: "sold/café",
        kind: "local",
        href: "https://example.net",
      }),
      "publicite-sold-caf.png",
    );
  });

  it("maps common image extensions to MIME types", () => {
    assert.equal(mimeFromFilename("flyer.png"), "image/png");
    assert.equal(mimeFromFilename("house.svg"), "image/svg+xml");
    assert.equal(mimeFromFilename("photo.JPEG"), "image/jpeg");
    assert.equal(mimeFromFilename("nope"), "application/octet-stream");
  });
});

describe("downloadCreativeImage", () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

  it("saves via blob URL + download attribute on desktop", async () => {
    const clicks: CreativeDownloadAnchor[] = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/coop.svg", filename: "coop.svg", shareTitle: "Publicité" },
      {
        fetch: async () => new Response(png, { status: 200 }),
        createObjectUrl: () => "blob:test-coop",
        clickAnchor: (anchor) => clicks.push(anchor),
        isAppleWebkit: false,
      },
    );
    assert.equal(result, "saved");
    assert.equal(clicks.length, 1);
    assert.equal(clicks[0]?.href, "blob:test-coop");
    assert.equal(clicks[0]?.download, "coop.svg");
    assert.equal(clicks[0]?.target, undefined);
  });

  it("uses the iOS share sheet when files can be shared", async () => {
    const shared: ShareData[] = [];
    const clicks: CreativeDownloadAnchor[] = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/marche.svg", filename: "marche.svg", shareTitle: "Publicité" },
      {
        fetch: async () => new Response(png, { status: 200 }),
        createObjectUrl: () => "blob:unused",
        clickAnchor: (anchor) => clicks.push(anchor),
        canShare: (data) => Boolean(data.files?.length),
        share: async (data) => {
          shared.push(data);
        },
        isAppleWebkit: true,
      },
    );
    assert.equal(result, "shared");
    assert.equal(shared.length, 1);
    assert.equal(shared[0]?.files?.[0]?.name, "marche.svg");
    assert.equal(clicks.length, 0);
  });

  it("treats a dismissed iOS share sheet as cancelled, not a failure", async () => {
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/atelier.svg", filename: "atelier.svg" },
      {
        fetch: async () => new Response(png, { status: 200 }),
        canShare: () => true,
        share: async () => {
          throw new DOMException("Share canceled", "AbortError");
        },
        clickAnchor: () => {
          throw new Error("should not fall through after abort");
        },
        isAppleWebkit: true,
      },
    );
    assert.equal(result, "cancelled");
  });

  it("opens a new tab on iOS when share is unavailable so long-press still works", async () => {
    const clicks: CreativeDownloadAnchor[] = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/coop.svg", filename: "coop.svg" },
      {
        fetch: async () => new Response(png, { status: 200 }),
        createObjectUrl: () => "blob:ios-open",
        clickAnchor: (anchor) => clicks.push(anchor),
        canShare: () => false,
        isAppleWebkit: true,
      },
    );
    assert.equal(result, "opened");
    assert.equal(clicks[0]?.href, "blob:ios-open");
    assert.equal(clicks[0]?.target, "_blank");
    assert.equal(clicks[0]?.download, "coop.svg");
  });

  it("falls back to the original URL when fetch fails", async () => {
    const clicks: CreativeDownloadAnchor[] = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/coop.svg", filename: "coop.svg" },
      {
        fetch: async () => new Response("nope", { status: 404 }),
        clickAnchor: (anchor) => clicks.push(anchor),
        isAppleWebkit: false,
      },
    );
    assert.equal(result, "saved");
    assert.equal(clicks[0]?.href, "/xsnow/partners/coop.svg");
    assert.equal(clicks[0]?.download, "coop.svg");
  });

  it("still uses a real download when Chromium spoofs an iPhone UA (Playwright e2e)", async () => {
    const clicks: CreativeDownloadAnchor[] = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/partners/coop.svg", filename: "coop.svg" },
      {
        fetch: async () => new Response(png, { status: 200 }),
        createObjectUrl: () => "blob:playwright",
        clickAnchor: (anchor) => clicks.push(anchor),
        canShare: () => false,
        isAppleWebkit: false,
      },
    );
    assert.equal(result, "saved");
    assert.equal(clicks[0]?.href, "blob:playwright");
    assert.equal(clicks[0]?.target, undefined);
  });
});

describe("isAppleWebkitMobile", () => {
  const iphoneSafari =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

  it("is true only for iOS with an Apple vendor, not Chromium spoofing Safari", () => {
    assert.equal(
      isAppleWebkitMobile({ userAgent: iphoneSafari, vendor: "Apple Computer, Inc." }),
      true,
    );
    assert.equal(
      isAppleWebkitMobile({ userAgent: iphoneSafari, vendor: "Google Inc." }),
      false,
    );
    assert.equal(
      isAppleWebkitMobile({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128",
        vendor: "Google Inc.",
      }),
      false,
    );
  });
});
