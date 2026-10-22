-- Training explanation per decision (Popol, 21/10/2026): kept as evidence that the arbiter was shown
-- why the decision was right (followed Indiana's suggestion) or the suggested reasoning (contradicted),
-- with the Manuel de justice excerpt. One row per (case, arbiter). No identity data, no pay figures.
CREATE TABLE IF NOT EXISTS arb_explanations (
  case_id TEXT NOT NULL,
  arbiter_id TEXT NOT NULL,
  simulation INTEGER NOT NULL DEFAULT 1,
  followed INTEGER NOT NULL,
  chosen TEXT,
  suggested TEXT,
  manual_ref TEXT NOT NULL,
  manual_version TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, arbiter_id)
);
CREATE INDEX IF NOT EXISTS idx_arb_explanations_arbiter ON arb_explanations (arbiter_id, created_at);
