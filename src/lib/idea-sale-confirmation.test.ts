import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ideaSaleConfirmationEndpoint,
  ideaSaleConfirmationMail,
  ideaSaleMailLang,
  parseIdeaSaleConfirmation,
  postIdeaSaleConfirmation,
} from "./idea-sale-confirmation.ts";

const input = {
  id: "idee-vente-abc123",
  email: "Marie@Voisin.Test",
  title: "Cours de cuisine du quartier",
  number: 1,
  lang: "fr",
};

describe("confirmation courriel « vendre mes idées »", () => {
  it("composes the receipt in the form's language, with the title and the list number", () => {
    const fr = ideaSaleConfirmationMail({ title: input.title, number: 1 }, "fr");
    assert.equal(fr.subject, "Ton idée a bien été reçue — idée nº 1");
    assert.ok(fr.text.includes("Cours de cuisine du quartier"));
    assert.ok(fr.text.includes("idée nº 1"));
    assert.ok(fr.text.includes("Mes idées proposées"));
    // The section's honest texts: read by the team, reply if approved,
    // compensation set by the team — never a promised amount or percentage.
    assert.ok(fr.text.includes("relue par l’équipe d’Essaim-Agents"));
    assert.ok(fr.text.includes("Aucun montant ni pourcentage n’est promis à l’avance"));
    assert.ok(fr.text.includes("ton idée reste la tienne"));

    const en = ideaSaleConfirmationMail({ title: input.title, number: 2 }, "en");
    assert.equal(en.subject, "Your idea has been received — idea no. 2");
    assert.ok(en.text.includes("My submitted ideas"));
    assert.ok(en.text.includes("No amount or percentage is promised in advance"));

    const es = ideaSaleConfirmationMail({ title: input.title, number: 3 }, "es");
    assert.equal(es.subject, "Tu idea ha sido recibida — idea n.º 3");
    assert.ok(es.text.includes("Mis ideas enviadas"));
  });

  it("parses strictly: valid input normalized, anything else refused", () => {
    assert.deepEqual(parseIdeaSaleConfirmation(input), {
      id: "idee-vente-abc123",
      email: "marie@voisin.test",
      title: "Cours de cuisine du quartier",
      number: 1,
      lang: "fr",
    });
    assert.equal(parseIdeaSaleConfirmation({ ...input, email: "pas-un-courriel" }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, email: "" }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, number: 0 }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, number: 10_000 }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, number: 1.5 }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, id: "" }), null);
    assert.equal(parseIdeaSaleConfirmation({ ...input, title: "  " }), null);
    assert.equal(parseIdeaSaleConfirmation(null), null);
    assert.equal(parseIdeaSaleConfirmation("texte"), null);
    // Unknown language falls back to French, the team's language.
    assert.equal(ideaSaleMailLang("en"), "en");
    assert.equal(ideaSaleMailLang("es"), "es");
    assert.equal(ideaSaleMailLang("de"), "fr");
    assert.equal(ideaSaleMailLang(undefined), "fr");
  });

  it("derives its endpoint next to /ideas, like /register", () => {
    assert.equal(
      ideaSaleConfirmationEndpoint("https://chat.example.test"),
      "https://chat.example.test/idea-sale-confirmation",
    );
  });

  it("posts best-effort: sent only on the Worker's emailed=true, and never throws", async () => {
    const okFetch = (async () =>
      new Response(JSON.stringify({ ok: true, emailed: true }), { status: 200 })) as typeof fetch;
    assert.equal(await postIdeaSaleConfirmation(input, okFetch), "sent");

    const notEmailedFetch = (async () =>
      new Response(JSON.stringify({ ok: true, emailed: false, reason: "off" }), {
        status: 200,
      })) as typeof fetch;
    assert.equal(await postIdeaSaleConfirmation(input, notEmailedFetch), "failed");

    const httpErrorFetch = (async () =>
      new Response("boom", { status: 500 })) as typeof fetch;
    assert.equal(await postIdeaSaleConfirmation(input, httpErrorFetch), "failed");

    const throwingFetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;
    // A failed confirmation e-mail resolves "failed" — the submission
    // itself already succeeded and is never invalidated by this call.
    assert.equal(await postIdeaSaleConfirmation(input, throwingFetch), "failed");

    // An unparseable request never reaches the network.
    let called = false;
    const spyFetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    assert.equal(
      await postIdeaSaleConfirmation({ ...input, email: "invalide" }, spyFetch),
      "failed",
    );
    assert.equal(called, false);
  });
});
