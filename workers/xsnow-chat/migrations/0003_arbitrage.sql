-- HITL arbitration. Identity fields and ID photo are AES-GCM encrypted by the Worker
-- (ARBITER_ENC_KEY secret). No face images are ever stored: only the browser score.
-- Raw identity (`identity_enc`, `photo_enc`) is purged after `purge_after` (minimal retention).
CREATE TABLE IF NOT EXISTS arbiters (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  opc_id TEXT,
  identity_enc TEXT,
  photo_enc TEXT,
  identity_hash TEXT NOT NULL,
  doc_expiry TEXT NOT NULL,
  face_score REAL,
  face_liveness INTEGER NOT NULL DEFAULT 0,
  face_method TEXT,
  face_reviewed INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  terms_version TEXT NOT NULL,
  terms_accepted_at TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  purge_after INTEGER
);

CREATE TABLE IF NOT EXISTS arb_cases (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  case_json TEXT NOT NULL,
  suggestion_json TEXT,
  decision_json TEXT,
  arbiter_id TEXT,
  created_at INTEGER NOT NULL,
  decided_at INTEGER
);
