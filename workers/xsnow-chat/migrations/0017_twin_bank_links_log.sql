-- Banque jumeau v2 : liaison des comptes jumeau, journal d'usage (append-only),
-- refus d'usages interdits, signalements d'abus. Cahier Jumeau v1.1 § 7.5–7.7.
-- Aucun identifiant de compte en clair : seulement une empreinte SHA-256.
CREATE TABLE IF NOT EXISTS twin_subscribers (
  subscriber_id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL,
  linked_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  suspended_at INTEGER
);

-- Append-only: one line per generated output (never updated, never deleted before 3 years).
CREATE TABLE IF NOT EXISTS twin_outputs (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  prompt_sha256 TEXT NOT NULL,
  prompt_summary TEXT NOT NULL,
  output_sha256 TEXT,
  published_url TEXT,
  provenance_json TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_twin_outputs_lender ON twin_outputs (lender_id, created_at);

CREATE TABLE IF NOT EXISTS twin_prompt_refusals (
  subscriber_id TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  prompt_sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_twin_refusals_sub ON twin_prompt_refusals (subscriber_id, reviewed_at);

CREATE TABLE IF NOT EXISTS twin_abuse_reports (
  id TEXT PRIMARY KEY,
  output_id TEXT,
  lender_id TEXT,
  subscriber_id TEXT,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
