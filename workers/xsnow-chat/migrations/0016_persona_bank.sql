-- Banque d'images et de voix des jumeaux numériques (OPC « Monétise-toi » → Jumeau).
-- Media live in the PRIVATE R2 bucket bound as PERSONA_BANK; only keys are stored here.
CREATE TABLE IF NOT EXISTS persona_lenders (
  id TEXT PRIMARY KEY,
  pseudonym TEXT NOT NULL,
  country TEXT NOT NULL,
  offer_voice INTEGER NOT NULL DEFAULT 0,
  offer_image INTEGER NOT NULL DEFAULT 0,
  consent_version TEXT NOT NULL,
  consent_at INTEGER NOT NULL,
  liveness_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  withdraw_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_persona_lenders_status ON persona_lenders (status, created_at);

CREATE TABLE IF NOT EXISTS persona_samples (
  lender_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (lender_id, asset)
);

-- One line per subscriber × item × kind × month. test_mode = 1: nothing charged.
CREATE TABLE IF NOT EXISTS twin_bank_usage (
  subscriber_id TEXT NOT NULL,
  lender_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  month TEXT NOT NULL,
  amount_cad_cents INTEGER NOT NULL,
  lender_cents INTEGER NOT NULL,
  opc_cents INTEGER NOT NULL,
  platform_cents INTEGER NOT NULL,
  payout_after INTEGER NOT NULL,
  test_mode INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE (subscriber_id, lender_id, kind, month)
);
CREATE INDEX IF NOT EXISTS idx_twin_bank_usage_lender ON twin_bank_usage (lender_id, month);
