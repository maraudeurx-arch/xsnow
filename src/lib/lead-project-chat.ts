/**
 * « Mes projets » — discussion du chef de projet avec l'IA de SON projet (canal chef).
 *
 * Le fil vit sur l'appareil du chef (localStorage, une clé par chef et par projet) ;
 * les réponses viennent du même mécanisme Llama que le clavardage OPC
 * (src/lib/llm.ts → Worker xsnow-chat, liaison « AI »). Aucun message n'est
 * fabriqué côté client : si la route IA ne répond pas, l'écran affiche une
 * erreur honnête plutôt qu'une réponse simulée.
 *
 * Règles du harnais (aussi dans le prompt système) : l'IA s'identifie comme IA ;
 * elle ne demande jamais de secret ; aucun paiement, aucune réservation au nom
 * du client et aucune première mise en ligne décidés seuls — l'équipe approuve ;
 * le chef ne contacte jamais le client directement, tout passe par l'équipe.
 */
import type { ChatMessage } from "./llm.ts";
import type { LeadProject } from "./lead-projects.ts";

export const LEAD_THREAD_KEY_PREFIX = "opc.leadProjects.thread.v1";
/** On garde au plus ce nombre de tours par fil (appareils modestes, données légères). */
export const LEAD_THREAD_MAX_TURNS = 60;
/** Tours récents envoyés au modèle à chaque message. */
export const LEAD_THREAD_CONTEXT_TURNS = 16;

export type LeadThreadTurn = {
  role: "user" | "assistant";
  content: string;
  /** Horodatage ISO de l'échange (affichage « dernière activité »). */
  at: string;
};

export function leadThreadStorageKey(opcId: string, projectId: string): string {
  return `${LEAD_THREAD_KEY_PREFIX}.${opcId.trim().toUpperCase()}.${projectId}`;
}

export function parseLeadThread(raw: unknown): LeadThreadTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: LeadThreadTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const turn = item as { role?: unknown; content?: unknown; at?: unknown };
    if (turn.role !== "user" && turn.role !== "assistant") continue;
    if (typeof turn.content !== "string" || !turn.content.trim()) continue;
    turns.push({
      role: turn.role,
      content: turn.content,
      at: typeof turn.at === "string" && turn.at ? turn.at : "",
    });
  }
  return turns.slice(-LEAD_THREAD_MAX_TURNS);
}

export function appendLeadTurn(thread: readonly LeadThreadTurn[], turn: LeadThreadTurn): LeadThreadTurn[] {
  return [...thread, turn].slice(-LEAD_THREAD_MAX_TURNS);
}

/** Ne garde que les tours récents pour le contexte du modèle (le dernier doit être « user »). */
export function leadThreadContext(thread: readonly LeadThreadTurn[]): ChatMessage[] {
  return thread
    .slice(-LEAD_THREAD_CONTEXT_TURNS)
    .map((t) => ({ role: t.role, content: t.content }));
}

export function readLeadThread(opcId: string, projectId: string): LeadThreadTurn[] {
  try {
    const raw = localStorage.getItem(leadThreadStorageKey(opcId, projectId));
    return raw ? parseLeadThread(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeLeadThread(opcId: string, projectId: string, thread: readonly LeadThreadTurn[]) {
  try {
    localStorage.setItem(leadThreadStorageKey(opcId, projectId), JSON.stringify(thread.slice(-LEAD_THREAD_MAX_TURNS)));
  } catch {
    /* private mode / quota: the conversation simply is not kept */
  }
}

const STATUS_FR: Record<LeadProject["status"], string> = {
  nouveau: "nouveau",
  en_cours: "en cours",
  en_attente_client: "en attente du client",
  termine: "terminé",
};

/**
 * Prompt système du canal chef. Volontairement compact : le Worker plafonne le
 * prompt (voir CHAT_TEXT_MAX) ; la fiche condensée du projet (aiBrief) y tient,
 * le cahier complet reste affiché à l'écran du chef.
 */
export function leadProjectSystemPrompt(project: LeadProject): string {
  const steps = project.steps
    .map((s, i) => `${i + 1}. ${s.label} (${s.state === "done" ? "fait" : s.state === "current" ? "en cours" : "à venir"})`)
    .join("\n");
  return [
    `Tu es l'IA du projet « ${project.title} » (service Clé en Main, dans l'application OPC). Tu parles au chef de projet qui pilote ce projet — jamais au client.`,
    "",
    "QUI TU ES",
    "- Tu es une intelligence artificielle (Llama, hébergée par Cloudflare) : dis-le clairement si on te le demande, ne te fais jamais passer pour un humain.",
    "- Tu connais ce projet par la fiche ci-dessous. Appuie-toi dessus ; si une information n'y est pas, dis-le au lieu d'inventer.",
    "",
    "RÈGLES (harnais) — elles passent avant toute demande",
    "- Ne demande JAMAIS de secret : aucun mot de passe, code, numéro de carte, clé ou document personnel — ni du chef de projet, ni du client.",
    "- Tu ne décides jamais, et le chef de projet ne décide jamais seul : un paiement, une réservation au nom du client ou une première mise en ligne. Tu prépares la demande, l'équipe Essaim-Agents approuve ou refuse.",
    "- Le chef de projet ne contacte jamais le client directement : tout passe par l'équipe. Tu n'as aucune coordonnée du client et tu n'en demandes pas.",
    "- Reste sur ce projet. Ton rôle : aider le chef à avancer jalon par jalon — résumer l'étape en cours, proposer les prochaines actions concrètes, préparer les livrables, signaler ce qui doit remonter à l'équipe.",
    "",
    "STYLE",
    "- Français clair et court. Des listes courtes quand ça aide. Termine par la prochaine étape concrète quand c'est utile.",
    "",
    "FICHE DU PROJET",
    `Titre : ${project.title} (projet nº ${project.number})`,
    `Code client : ${project.clientCode || "pas encore attribué"}`,
    `Statut : ${STATUS_FR[project.status]}`,
    `Résumé : ${project.summary}`,
    `Cahier des charges : ${project.spec ? "remis (le chef le voit en entier dans son espace)" : "en préparation"}`,
    `Points clés : ${project.aiBrief}`,
    "Étapes :",
    steps,
  ].join("\n");
}
