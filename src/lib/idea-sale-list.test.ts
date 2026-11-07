import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { IdeaSaleForm } from "./idea-sale.ts";
import {
  appendIdeaSaleSubmission,
  parseIdeaSaleSubmissions,
  readIdeaSaleSubmissions,
  recordIdeaSaleSubmission,
  submissionFromIdeaSaleForm,
  writeIdeaSaleSubmissions,
  type IdeaSaleSubmission,
} from "./idea-sale-list.ts";
import { fr } from "./i18n/fr.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

const form: IdeaSaleForm = {
  title: "Cours de cuisine du quartier",
  category: "divertissement",
  description:
    "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins. Petit prix, groupes de huit, recettes à emporter.",
  summary: "Des ateliers de cuisine locale pour les nouveaux arrivants, animés par des voisins.",
  summaryApproved: true,
  price: "250",
  name: "Marie Tremblay",
  email: "marie@voisin.test",
  consent: true,
};

const first: IdeaSaleSubmission = {
  id: "idee-vente-aaa",
  title: "Première idée",
  category: "affaires",
  summary: "Un résumé approuvé, assez long pour décrire la première idée.",
  priceUsd: 100,
  submittedAt: "2026-11-07T09:00:00.000Z",
};

const second: IdeaSaleSubmission = {
  id: "idee-vente-bbb",
  title: "Deuxième idée",
  category: "autre",
  summary: "Un résumé approuvé, assez long pour décrire la deuxième idée.",
  priceUsd: null,
  submittedAt: "2026-11-07T10:30:00.000Z",
};

describe("mes idées proposées", () => {
  it("builds the on-device copy from the form: approved summary and USD price, no contact fields", () => {
    const entry = submissionFromIdeaSaleForm(form, "idee-vente-xyz", new Date("2026-11-07T12:00:00.000Z"));
    assert.equal(entry.id, "idee-vente-xyz");
    assert.equal(entry.title, form.title);
    assert.equal(entry.category, "divertissement");
    // The approved summary is what the team received — and what is listed.
    assert.equal(entry.summary, form.summary);
    assert.equal(entry.priceUsd, 250);
    assert.equal(entry.submittedAt, "2026-11-07T12:00:00.000Z");
    // No name, no e-mail in the local copy: nothing new is collected.
    assert.deepEqual(Object.keys(entry).sort(), [
      "category",
      "id",
      "priceUsd",
      "submittedAt",
      "summary",
      "title",
    ]);
  });

  it("keeps the price null when the form price cannot be parsed", () => {
    const entry = submissionFromIdeaSaleForm({ ...form, price: "" }, "idee-vente-noprix", new Date());
    assert.equal(entry.priceUsd, null);
  });

  it("appends in submission order without overwriting — numbering is the array order", () => {
    const one = appendIdeaSaleSubmission([], first);
    const two = appendIdeaSaleSubmission(one, second);
    assert.deepEqual(
      two.map((entry) => entry.title),
      ["Première idée", "Deuxième idée"],
    );
    // Idea nº 1 stays nº 1 after a second submission arrives.
    assert.equal(two[0]?.id, first.id);
    assert.equal(two[1]?.id, second.id);
    // The original list is not mutated.
    assert.equal(one.length, 1);
  });

  it("ignores a duplicate id, so a send can never be recorded twice", () => {
    const list = appendIdeaSaleSubmission([first], { ...first, title: "Copie" });
    assert.equal(list.length, 1);
    assert.equal(list[0]?.title, "Première idée");
  });

  it("records through storage: a later submission adds to the earlier ones", () => {
    const store = memoryStore();
    assert.deepEqual(readIdeaSaleSubmissions(store), []);
    const afterFirst = recordIdeaSaleSubmission(first, store);
    assert.deepEqual(afterFirst, [first]);
    const afterSecond = recordIdeaSaleSubmission(second, store);
    assert.deepEqual(afterSecond, [first, second]);
    // A fresh read (the person coming back to the section) sees both, in order.
    assert.deepEqual(readIdeaSaleSubmissions(store), [first, second]);
  });

  it("round-trips a written list and drops unusable stored entries", () => {
    const store = memoryStore();
    writeIdeaSaleSubmissions([first, second], store);
    assert.deepEqual(readIdeaSaleSubmissions(store), [first, second]);

    assert.deepEqual(parseIdeaSaleSubmissions(null), []);
    assert.deepEqual(parseIdeaSaleSubmissions("pas du json"), []);
    assert.deepEqual(parseIdeaSaleSubmissions('{"id":"x"}'), []);
    assert.deepEqual(
      parseIdeaSaleSubmissions(
        JSON.stringify([
          { ...second, category: "inconnue" },
          { ...second, id: "idee-vente-bad-date", submittedAt: "n-importe-quoi" },
          { ...first, priceUsd: -5 },
          first,
        ]),
      ),
      // The bad-category and bad-date entries are dropped; a bad price
      // degrades to null instead of dropping the whole submission.
      [{ ...first, priceUsd: null }, first],
    );
  });

  it("has sober list labels in FR, EN and ES", () => {
    for (const messages of [fr, en, es]) {
      const g = messages.earnNow.ideaSale;
      assert.ok(g.myIdeasTitle.length > 0);
      assert.ok(g.myIdeaNo.length > 0);
      assert.ok(g.myIdeaReceived.length > 0);
      assert.ok(g.myIdeaPrice.length > 0);
      assert.ok(g.submitAnother.length > 0);
    }
    assert.equal(fr.earnNow.ideaSale.myIdeasTitle, "Mes idées proposées");
  });
});
