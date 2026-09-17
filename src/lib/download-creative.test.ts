import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  downloadCreativeImage,
  mimeFromFilename,
  sanitizeDownloadFilename,
} from "./download-creative.ts";

describe("creative download", () => {
  it("sanitizes filenames and maps image mime types", () => {
    assert.equal(sanitizeDownloadFilename("bogo chat.png"), "bogo-chat.png");
    assert.equal(sanitizeDownloadFilename("../x"), "..-x");
    assert.equal(mimeFromFilename("bogo-cat.png"), "image/png");
    assert.equal(mimeFromFilename("garderie.svg"), "image/svg+xml");
  });

  it("saves a fetched blob via the download attribute", async () => {
    const clicks: Array<{ href: string; download: string }> = [];
    const blob = new Blob(["cat"], { type: "image/png" });
    const result = await downloadCreativeImage(
      { url: "/xsnow/ads/bogo-cat.png", filename: "bogo-chat.png" },
      {
        fetch: async () => new Response(blob, { status: 200 }),
        createObjectUrl: () => "blob:bogo",
        revokeObjectUrl: () => {},
        clickAnchor: (anchor) => clicks.push(anchor),
        isAppleWebkit: false,
      },
    );
    assert.equal(result, "saved");
    assert.equal(clicks[0]?.download, "bogo-chat.png");
    assert.equal(clicks[0]?.href, "blob:bogo");
  });

  it("opens on Apple WebKit so long-press can save", async () => {
    const clicks: Array<{ href: string; target?: string }> = [];
    const result = await downloadCreativeImage(
      { url: "/xsnow/ads/bogo-cat.png", filename: "bogo-chat.png" },
      {
        fetch: async () => new Response("nope", { status: 500 }),
        clickAnchor: (anchor) => clicks.push(anchor),
        isAppleWebkit: true,
      },
    );
    assert.equal(result, "opened");
    assert.equal(clicks[0]?.target, "_blank");
  });
});
