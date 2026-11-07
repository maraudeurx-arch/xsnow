import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleIdeaAttachmentsPost, isIdeaAttachmentsPath } from "./idea-attachments.ts";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("isIdeaAttachmentsPath", () => {
  it("matches /idea-attachments only", () => {
    assert.equal(isIdeaAttachmentsPath("/idea-attachments"), true);
    assert.equal(isIdeaAttachmentsPath("/idea-attachments/"), true);
    assert.equal(isIdeaAttachmentsPath("/ideas"), false);
    assert.equal(isIdeaAttachmentsPath("/business-ads"), false);
  });
});

describe("handleIdeaAttachmentsPost", () => {
  it("rejects invalid bodies", async () => {
    assert.equal((await handleIdeaAttachmentsPost({}, {})).status, 400);
    // Missing id.
    assert.equal(
      (await handleIdeaAttachmentsPost({ mime: "image/png", base64: TINY_PNG_BASE64 }, {})).status,
      400,
    );
    // Refused type: SVG never travels, even with a valid id and payload.
    assert.equal(
      (
        await handleIdeaAttachmentsPost(
          { id: "idee-vente-abc123", mime: "image/svg+xml", base64: TINY_PNG_BASE64 },
          {},
        )
      ).status,
      400,
    );
    // Oversize payload (decoded size over the cap).
    const big = Buffer.alloc(401 * 1024).toString("base64");
    assert.equal(
      (
        await handleIdeaAttachmentsPost(
          { id: "idee-vente-abc123", mime: "application/pdf", base64: big },
          {},
        )
      ).status,
      400,
    );
  });

  it("accepts a valid file and reports not_configured without a Resend key", async () => {
    const res = await handleIdeaAttachmentsPost(
      {
        id: "idee-vente-abc123",
        title: "Prototype de lampe",
        opcId: "",
        filename: "photo.png",
        mime: "image/png",
        base64: TINY_PNG_BASE64,
      },
      {},
    );
    assert.equal(res.status, 502);
    const json = (await res.json()) as { ok?: boolean; emailed?: boolean; reason?: string };
    assert.equal(json.ok, true);
    assert.equal(json.emailed, false);
    assert.equal(json.reason, "not_configured");
  });
});
