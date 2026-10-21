-- SIMULATION-only invitations: lets the owner show simulation cases to a non-verified
-- arbiter (e.g. pending / rescan_requested). Does NOT change arbiters.status, gives no
-- access to real cases, no payment, no signature, no reputation.
CREATE TABLE IF NOT EXISTS arb_sim_invites (
  arbiter_id TEXT PRIMARY KEY,
  invited_at INTEGER NOT NULL
);
