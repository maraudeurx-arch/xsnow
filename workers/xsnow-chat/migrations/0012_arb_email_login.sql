-- Email login for existing arbiters (Popol, 22/10/2026): the iPhone home-screen app has its own storage,
-- so an arbiter who installed it must find their existing profile without signing up again.
-- A 6-digit code is emailed (only its hash is stored), valid 15 minutes, 5 tries, one use.
CREATE TABLE IF NOT EXISTS arb_login_codes (
  arbiter_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (arbiter_id, created_at)
);
-- Extra device sessions (e.g. browser + home-screen app). Only the token hash is stored.
CREATE TABLE IF NOT EXISTS arb_device_tokens (
  token_hash TEXT PRIMARY KEY,
  arbiter_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_arb_device_tokens_arbiter ON arb_device_tokens (arbiter_id);
