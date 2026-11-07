import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEAD_THREAD_MAX_TURNS,
  appendLeadTurn,
  leadProjectSystemPrompt,
  leadThreadContext,
  leadThreadStorageKey,
  parseLeadThread,
  type LeadThreadTurn,
} from "./lead-project-chat.ts";
import { findLeadProject } from "./lead-projects.ts";
import { CHAT_TEXT_MAX } from "./sanitize.ts";

const education = findLeadProject("OPC-5X78", "education");
const couture = findLeadProject("OPC-UBNZ", "haute-couture");
assert.ok(education && couture);

describe("mes projets — prompt système du canal chef", () => {
  it("identifie l'IA, nomme le projet et impose les règles du harnais", () => {
    const prompt = leadProjectSystemPrompt(education);
    assert.match(prompt, /intelligence artificielle/);
    assert.match(prompt, /Éducation/);
    assert.match(prompt, /CLE-PQ0ASQ/);
    assert.match(prompt, /Ne demande JAMAIS de secret/);
    assert.match(prompt, /première mise en ligne/);
    assert.match(prompt, /ne contacte jamais le client directement/);
    assert.match(prompt, /chef de projet/);
  });

  it("dit l'état réel du cahier : remis pour Éducation, en préparation pour Haute couture", () => {
    assert.match(leadProjectSystemPrompt(education), /Cahier des charges : remis/);
    assert.match(leadProjectSystemPrompt(couture), /Cahier des charges : en préparation/);
    assert.match(leadProjectSystemPrompt(couture), /Haute couture/);
  });

  it("tient sous le plafond du Worker (CHAT_TEXT_MAX)", () => {
    assert.ok(leadProjectSystemPrompt(education).length < CHAT_TEXT_MAX);
    assert.ok(leadProjectSystemPrompt(couture).length < CHAT_TEXT_MAX);
  });
});

describe("mes projets — fil de discussion (stockage appareil)", () => {
  const turn = (role: "user" | "assistant", content: string, at = "2026-11-07T12:00:00.000Z"): LeadThreadTurn => ({ role, content, at });

  it("clé de stockage par chef et par projet", () => {
    assert.equal(leadThreadStorageKey("opc-5x78", "education"), "opc.leadProjects.thread.v1.OPC-5X78.education");
  });

  it("parseLeadThread rejette le bruit et garde l'ordre", () => {
    const parsed = parseLeadThread([
      turn("user", "Bonjour"),
      { role: "system", content: "intrus" },
      { role: "assistant", content: "" },
      null,
      "texte",
      turn("assistant", "Voici l'étape en cours."),
    ]);
    assert.deepEqual(parsed.map((t) => t.content), ["Bonjour", "Voici l'étape en cours."]);
    assert.deepEqual(parseLeadThread("pas un tableau"), []);
    assert.deepEqual(parseLeadThread(undefined), []);
  });

  it("appendLeadTurn ajoute et plafonne le fil", () => {
    let thread: LeadThreadTurn[] = [];
    for (let i = 0; i < LEAD_THREAD_MAX_TURNS + 5; i += 1) {
      thread = appendLeadTurn(thread, turn(i % 2 ? "assistant" : "user", `m${i}`));
    }
    assert.equal(thread.length, LEAD_THREAD_MAX_TURNS);
    assert.equal(thread[thread.length - 1]?.content, `m${LEAD_THREAD_MAX_TURNS + 4}`);
  });

  it("leadThreadContext ne garde que les tours récents, rôles préservés", () => {
    const thread = [turn("user", "q1"), turn("assistant", "r1"), turn("user", "q2")];
    assert.deepEqual(leadThreadContext(thread), [
      { role: "user", content: "q1" },
      { role: "assistant", content: "r1" },
      { role: "user", content: "q2" },
    ]);
  });
});
