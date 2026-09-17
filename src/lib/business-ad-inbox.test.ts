import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessAdsInboxEndpoint,
  parseBusinessAdInboxInput,
  postBusinessAdToInbox,
} from "./business-ad-inbox.ts";

const tinyJpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z";

describe("parseBusinessAdInboxInput", () => {
  it("requires name, contact email, and safe image data URL", () => {
    assert.equal(parseBusinessAdInboxInput(null), null);
    assert.equal(
      parseBusinessAdInboxInput({
        name: "Café Bogo",
        contactEmail: "not-an-email",
        imageDataUrl: tinyJpeg,
      }),
      null,
    );
    const ok = parseBusinessAdInboxInput({
      id: "ad-1",
      name: "  Café Bogo  ",
      category: "Café",
      city: "Hull",
      description: "Petit-déj",
      contactEmail: "marie@voisin.test",
      opcId: "OPC-7K3M",
      imageDataUrl: tinyJpeg,
      imageBytes: 120,
    });
    assert.equal(ok?.name, "Café Bogo");
    assert.equal(ok?.contactEmail, "marie@voisin.test");
    assert.equal(ok?.opcId, "OPC-7K3M");
    assert.equal(ok?.city, "Hull");
    assert.match(ok?.imageDataUrl ?? "", /^data:image\/jpeg;base64,/);
  });

  it("rejects scripted names and unsafe data URLs", () => {
    assert.equal(
      parseBusinessAdInboxInput({
        name: "<script>x</script>",
        contactEmail: "ok@test.com",
        imageDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
      }),
      null,
    );
  });
});

describe("businessAdsInboxEndpoint", () => {
  it("appends /business-ads to the chat API base", () => {
    assert.equal(
      businessAdsInboxEndpoint("https://xsnow-chat.xsnowopc.workers.dev"),
      "https://xsnow-chat.xsnowopc.workers.dev/business-ads",
    );
    assert.equal(
      businessAdsInboxEndpoint("https://example.test/"),
      "https://example.test/business-ads",
    );
  });
});

describe("postBusinessAdToInbox", () => {
  it("POSTs base64 image and returns sent when emailed", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body || "") });
      return new Response(JSON.stringify({ ok: true, emailed: true }), { status: 200 });
    };
    const result = await postBusinessAdToInbox(
      {
        id: "ad-2",
        name: "Zozo",
        category: "Garderie",
        city: "Gatineau",
        description: "Places ouvertes",
        contactEmail: "zozo@test.com",
        opcId: "OPC-1",
        imageDataUrl: tinyJpeg,
        imageBytes: 80,
      },
      fetchImpl as typeof fetch,
    );
    assert.equal(result, "sent");
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /\/business-ads$/);
    const payload = JSON.parse(calls[0]!.body) as Record<string, unknown>;
    assert.equal(payload.name, "Zozo");
    assert.equal(payload.contactEmail, "zozo@test.com");
    assert.equal(typeof payload.imageBase64, "string");
    assert.equal(payload.imageFilename, "pub-business.jpg");
  });

  it("returns failed when the worker rejects", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ ok: false }), { status: 502 });
    const result = await postBusinessAdToInbox(
      {
        id: "ad-3",
        name: "Appart",
        category: "",
        city: "",
        description: "",
        contactEmail: "a@b.co",
        opcId: "",
        imageDataUrl: tinyJpeg,
        imageBytes: 10,
      },
      fetchImpl as typeof fetch,
    );
    assert.equal(result, "failed");
  });
});
