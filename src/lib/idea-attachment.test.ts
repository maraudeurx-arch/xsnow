import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hasPdfSignature,
  ideaAttachmentKind,
  ideaAttachmentMetaIssue,
  parseIdeaAttachmentDataUrl,
  postIdeaAttachment,
  prepareIdeaAttachment,
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

  it("judges a PDF on its content (extension + signature), never a false « too_big »", async () => {
    const pdfText = "%PDF-1.4\n% prototype sketch\n";

    // The file-manager case (Indiana Lane (IA), via Regie, 07/11/2026):
    // empty declared type, .pdf name, real PDF content, well under the
    // cap — accepted, with a normalized data URL. The old code read the
    // file back as a MIME-less data URL, failed its own whitelist parse
    // and refused it as « too_big ».
    const noType = await prepareIdeaAttachment(new File([pdfText], "croquis.pdf", { type: "" }));
    assert.ok(noType.ok);
    assert.equal(noType.value.mime, "application/pdf");
    assert.equal(noType.value.filename, "croquis.pdf");
    assert.equal(noType.value.bytes, pdfText.length);
    assert.ok(noType.value.dataUrl.startsWith("data:application/pdf;base64,"));
    // …and the prepared file still passes the strict whitelist parse
    // that postIdeaAttachment applies before anything leaves the device.
    assert.ok(parseIdeaAttachmentDataUrl(noType.value.dataUrl));

    // Declared PDF type with a real signature: accepted as before.
    const declared = await prepareIdeaAttachment(
      new File([pdfText], "croquis.pdf", { type: "application/pdf" }),
    );
    assert.ok(declared.ok);

    // .pdf name but the content is not a PDF: refused as a TYPE problem,
    // with the true reason — not « too_big ».
    const fake = await prepareIdeaAttachment(
      new File(["Bonjour, ceci n'est pas un PDF."], "document.pdf", { type: "" }),
    );
    assert.deepEqual(fake, { ok: false, reason: "bad_type" });

    // A declared application/pdf does not rescue non-PDF content either:
    // the signature is the judge.
    const fakeDeclared = await prepareIdeaAttachment(
      new File(["du texte déguisé"], "document.pdf", { type: "application/pdf" }),
    );
    assert.deepEqual(fakeDeclared, { ok: false, reason: "bad_type" });

    // Real signature but over the cap: « too_big » — and only then.
    const big = await prepareIdeaAttachment(
      new File(["%PDF-" + "x".repeat(IDEA_ATTACHMENT_MAX_BYTES)], "gros.pdf", { type: "" }),
    );
    assert.deepEqual(big, { ok: false, reason: "too_big" });

    // No type AND no .pdf extension: nothing establishes a PDF — refused
    // as a type problem without even reading the content.
    const anonymous = await prepareIdeaAttachment(new File([pdfText], "document", { type: "" }));
    assert.deepEqual(anonymous, { ok: false, reason: "bad_type" });
  });

  it("recognizes the PDF signature in a base64 head", () => {
    assert.equal(hasPdfSignature(TINY_PDF_BASE64), true);
    assert.equal(hasPdfSignature(Buffer.from("Bonjour le monde").toString("base64")), false);
    assert.equal(hasPdfSignature(""), false);
    assert.equal(hasPdfSignature("%%%pas-du-base64%%%"), false);
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
