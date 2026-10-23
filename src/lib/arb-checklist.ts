/**
 * Arbiter onboarding checklist (Popol, 21/10/2026: Indiana trains and approves every arbiter).
 * Pure logic shared by the Worker (GET /arbitrage/checklist) and the arbiter space.
 * Each item is "done" or "missing"; the UI shows short, simple steps for what is missing.
 */

/** Base Sepolia (test network only — no mainnet, no payment). */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

export const CHECKLIST_ITEMS = ["email", "notifications", "wallet", "face", "test_case", "manual"] as const;
export type ChecklistItemId = (typeof CHECKLIST_ITEMS)[number];

export type WalletState = "missing" | "done";
export type ChecklistItem = { id: ChecklistItemId; done: boolean; state?: WalletState };
export type Checklist = { items: ChecklistItem[]; doneCount: number; total: number; complete: boolean };

export type ChecklistInput = {
  status: string;
  hasEmail: boolean;
  pushSubscriptions: number;
  wallet: { address: string; chainId: number | null } | null;
  faceScore: number | null;
  faceLiveness: boolean;
  faceReviewed: boolean;
  simAnswers: number;
  manualReadAt: number | null;
};

/**
 * Wallet step (Popol, 22/10/2026): a connected address is enough, whatever network the wallet shows
 * (e.g. chain_id 1 on a phone wallet). No network switch is required; the network is informational only.
 */
export function walletState(w: ChecklistInput["wallet"]): WalletState {
  return w && w.address ? "done" : "missing";
}

/**
 * Face check: a pending rescan means it is NOT done. An approved (verified) arbiter or a scan the owner
 * reviewed counts as done; otherwise we need a live scan (liveness) with a score.
 */
export function faceCheckDone(i: Pick<ChecklistInput, "status" | "faceScore" | "faceLiveness" | "faceReviewed">): boolean {
  if (i.status === "rescan_requested") return false;
  if (i.status === "verified" || i.faceReviewed) return true;
  return i.faceLiveness && typeof i.faceScore === "number";
}

export function computeChecklist(i: ChecklistInput): Checklist {
  const ws = walletState(i.wallet);
  const done: Record<ChecklistItemId, boolean> = {
    email: i.hasEmail,
    notifications: i.pushSubscriptions > 0,
    wallet: ws === "done",
    face: faceCheckDone(i),
    test_case: i.simAnswers > 0,
    manual: typeof i.manualReadAt === "number" && i.manualReadAt > 0,
  };
  const items: ChecklistItem[] = CHECKLIST_ITEMS.map((id) => (id === "wallet" ? { id, done: done[id], state: ws } : { id, done: done[id] }));
  const doneCount = items.filter((x) => x.done).length;
  return { items, doneCount, total: items.length, complete: doneCount === items.length };
}

/** Arbiters write to OPC management (Popol, 23/10/2026): questions and suggestions, like OPC staff. */
export const OPC_DIRECTION_EMAIL = "opencommunity.opc@gmail.com";
export function arbContactHref(label: string, arbiterId: string): string {
  const id = /^[A-Za-z0-9_-]{1,40}$/.test(arbiterId) ? arbiterId : "";
  const subject = id ? `${label} ${id}` : label;
  return `mailto:${OPC_DIRECTION_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
