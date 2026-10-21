-- Web Push subscriptions of arbiters (opt-in "Activer les notifications").
-- Only the push-service endpoint is stored; pushes carry no payload (no case data).
CREATE TABLE IF NOT EXISTS arb_push_subs (
  endpoint TEXT PRIMARY KEY,
  arbiter_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_arb_push_subs_arbiter ON arb_push_subs (arbiter_id);
