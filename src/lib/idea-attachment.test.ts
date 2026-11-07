import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ideaAttachmentKind,
  ideaAttachmentMetaIssue,
  parseIdeaAttachmentDataUrl,
  postIdeaAttachment,
  IDEA_ATTACHMENT_MAX_BYTES,
  type PreparedIdeaAttachment,
} from "./idea-attachment.ts";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const TINY_PDF_BASE64 = Buffer.from("%PDF-1.4\n% prototype sketch\n").toString("base64");

describe("pièce jointe d'une idée à vendre", () => {
  it("accepts common image types and PDF, refuses everything else", () => {
    assert.equal(ideaAttachmentKind("image/jpeg"), "image");
    assert.equal(ideaAttachmentKind("image/png"), "image");
    assert.equal(ideaAttachmentKind("image/webp"), "image");
    assert.equal(ideaAttachmentKind("application/pdf"), "pdf");
    assert.equal(ideaAttachmentKind("image/gif"), null);
    assert.equal(ideaAttachmentKind("image/svg+xml"), null);
    assert.equal(ideaAttachmentKind("text/plain"), null);
    assert.equal(ideaAttachmentKind(""), null);
  });

  it("gates size explicitly: positive and within the cap", () => {
    assert.equal(ideaAttachmentMetaIssue({ type: "application/pdf", size: 120_000 }), null);
    assert.equal(ideaAttachmentMetaIssue({ type: "image/png", size: IDEA_ATTACHMENT_MAX_BYTES }), null);
    assert.equal(ideaAttachmentMetaIssue({ type: "application/pdf", size: IDEA_ATTACHMENT_MAX_BYTES + 1 }), "size");
    assert.equal(ideaAttachmentMetaIssue({ type: "application/pdf", size: 0 }), "size");
    assert.equal(ideaAttachmentMetaIssue({ type: "application/zip", size: 100 }), "type");
  });

  it("whitelist-parses data URLs and rejects bad types and oversize payloads", () => {
    const png = parseIdeaAttachmentDataUrl(`data:image/png;base64,${TINY_PNG_BASE64}`);
    assert.ok(png);
    assert.equal(png.mime, "image/png");
    assert.equal(png.kind, "image");
    assert.ok(png.bytes > 0);

    const pdf = parseIdeaAttachmentDataUrl(`data:application/pdf;base64,${TINY_PDF_BASE64}`);
    assert.ok(pdf);
    assert.equal(pdf.kind, "pdf");

    // SVG (scriptable) and arbitrary types never pass.
    assert.equal(parseIdeaAttachmentDataUrl(`data:image/svg+xml;base64,${TINY_PNG_BASE64}`), null);
    assert.equal(parseIdeaAttachmentDataUrl(`data:text/html;base64,${TINY_PDF_BASE64}`), null);
    assert.equal(parseIdeaAttachmentDataUrl("https://example.com/file.pdf"), null);
    assert.equal(parseIdeaAttachmentDataUrl(""), null);

    // Over the cap: refused cleanly, never truncated into a corrupt file.
    const big = Buffer.alloc(IDEA_ATTACHMENT_MAX_BYTES + 1024).toString("base64");
    assert.equal(parseIdeaAttachmentDataUrl(`data:application/pdf;base64,${big}`), null);
  });

  it("posts the file keyed by the proposal id, and fails cleanly", async () => {
    const attachment: PreparedIdeaAttachment = {
      dataUrl: `data:application/pdf;base64,${TINY_PDF_BASE64}`,
      mime: "application/pdf",
      filename: "croquis.pdf",
      bytes: 28,
    };
    const seen: Array<{ url: string; body: string }> = [];
    const okFetch = async (url: string | URL, init?: RequestInit) => {
      seen.push({ url: String(url), body: String(init?.body || "") });
      return new Response(JSON.stringify({ ok: true, emailed: true }), { status: 200 });
    };
    const sent = await postIdeaAttachment(
      { id: "idee-vente-abc123", title: "Prototype", opcId: "", attachment },
      okFetch as typeof fetch,
    );
    assert.equal(sent, "sent");
    assert.equal(seen.length, 1);
    assert.match(seen[0]!.url, /\/idea-attachments$/);
    const body = JSON.parse(seen[0]!.body) as { id: string; mime: string; base64: string; filename: string };
    assert.equal(body.id, "idee-vente-abc123");
    assert.equal(body.mime, "application/pdf");
    assert.equal(body.filename, "croquis.pdf");
    assert.equal(body.base64, TINY_PDF_BASE64);

    const koFetch = async () => new Response("nope", { status: 502 });
    assert.equal(
      await postIdeaAttachment({ id: "idee-vente-abc123", title: "t", attachment }, koFetch as typeof fetch),
      "failed",
    );

    // An invalid data URL never reaches the network.
    let calls = 0;
    const countingFetch = async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    };
    assert.equal(
      await postIdeaAttachment(
        { id: "idee-vente-abc123", title: "t", attachment: { ...attachment, dataUrl: "data:text/html;base64,AAAA" } },
        countingFetch as typeof fetch,
      ),
      "failed",
    );
    assert.equal(calls, 0);
  });

  it("the proposal stays sendable without any attachment", async () => {
    // The attachment is optional by design: postIdeaAttachment is simply
    // never called when the seller picks no file, and the proposal path
    // (idea-sale) has no attachment field at all.
    const { emptyIdeaSaleForm, ideaSaleIssues } = await import("./idea-sale.ts");
    const form = {
      ...emptyIdeaSaleForm(),
      title: "Idée sans fichier",
      description: "Description assez longue pour être valide, sans aucun document joint.",
      summary: "Description assez longue pour être valide, sans aucun document joint.",
      summaryApproved: true,
      price: "100",
      name: "Marie Tremblay",
      email: "marie@voisin.test",
      consent: true,
    };
    assert.deepEqual(ideaSaleIssues(form), []);
  });
});
