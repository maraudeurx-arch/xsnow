-- Consent-based proximity alerts. Live ping coordinates are not stored.
-- Phone / email are the guardian's outbound targets only (Twilio / Resend).
CREATE TABLE IF NOT EXISTS proximity_alerts (
  token TEXT PRIMARY KEY,
  person TEXT NOT NULL,
  place TEXT NOT NULL,
  place_lat REAL,
  place_lon REAL,
  radius_km INTEGER NOT NULL,
  schedule TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  last_ping_at INTEGER,
  last_distance_km REAL,
  last_outside INTEGER,
  last_sms_at INTEGER,
  created_at INTEGER NOT NULL
);
