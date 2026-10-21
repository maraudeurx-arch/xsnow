-- Simulation de dossier (test only). A simulation case lives in arb_cases with simulation = 1:
-- no AI suggestion, no webhook, no signature, no reputation change.
-- Each verified arbiter answers independently: one row per (case, arbiter) in arb_sim_answers.
ALTER TABLE arb_cases ADD COLUMN simulation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arb_cases ADD COLUMN choices_json TEXT;

CREATE TABLE IF NOT EXISTS arb_sim_answers (
  case_id TEXT NOT NULL,
  arbiter_id TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  comment TEXT,
  answered_at INTEGER NOT NULL,
  PRIMARY KEY (case_id, arbiter_id)
);
CREATE INDEX IF NOT EXISTS idx_arb_sim_answers_case ON arb_sim_answers (case_id);
