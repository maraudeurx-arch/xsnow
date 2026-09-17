import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AD_EMAIL_MAX_BYTES,
  AD_EMAIL_MAX_KB,
  AD_IMAGE_MAX_BYTES,
  AD_IMAGE_MAX_KB,
  adImageWithinLimit,
  dataUrlByteLength,
  isAdImageMime,
  isSafeImageDataUrl,
  prepareAdImage,
  preparedFilename,
} from "./compress-ad-image.ts";

describe("ad image KB cap", () => {
  it("uses a 400 Ko mobile-friendly hard limit", () => {
    assert.equal(AD_IMAGE_MAX_KB, 400);
    assert.equal(AD_IMAGE_MAX_BYTES, 400 * 1024);
    assert.equal(adImageWithinLimit(400 * 1024), true);
    assert.equal(adImageWithinLimit(400 * 1024 + 1), false);
    assert.equal(AD_EMAIL_MAX_KB, 150);
    assert.equal(AD_EMAIL_MAX_BYTES, 150 * 1024);
    assert.equal(adImageWithinLimit(0), false);
  });

  it("rejects SVG and non-images; allows photo MIME types", () => {
    assert.equal(isAdImageMime("image/jpeg"), true);
    assert.equal(isAdImageMime("image/png"), true);
    assert.equal(isAdImageMime("image/webp"), true);
    assert.equal(isAdImageMime("image/svg+xml"), false);
    assert.equal(isAdImageMime("text/plain"), false);
    assert.equal(isAdImageMime("application/pdf"), false);
  });

  it("counts data-URL payload bytes and keeps only image/* under the cap", () => {
    const tiny = "data:image/jpeg;base64,/9j/4AAQ";
    assert.ok(dataUrlByteLength(tiny) > 0);
    const padded = `data:image/jpeg;base64,${"A".repeat(16)}`;
    assert.equal(dataUrlByteLength(padded), 12);
    assert.equal(isSafeImageDataUrl("data:text/html;base64,PHNjcmlwdD4="), false);
    assert.equal(isSafeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), false);
    const okJpeg = `data:image/jpeg;base64,${"A".repeat(16)}`;
    assert.equal(isSafeImageDataUrl(okJpeg), true);
    const tooBig = `data:image/jpeg;base64,${"A".repeat(AD_IMAGE_MAX_BYTES * 2)}`;
    assert.equal(isSafeImageDataUrl(tooBig), false);
    assert.equal(preparedFilename("image/jpeg"), "publicite.jpg");
    assert.equal(preparedFilename("image/png"), "publicite.png");
  });

  it("rejects a non-image File without storing it", async () => {
    const file = new File(["not a photo"], "notes.txt", { type: "text/plain" });
    const result = await prepareAdImage(file);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "not_image");
  });

  it("rejects originals above the decode ceiling as too_large", async () => {
    const huge = new File([new Uint8Array(13 * 1024 * 1024)], "cam.jpg", { type: "image/jpeg" });
    const result = await prepareAdImage(huge);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "too_large");
  });
});
