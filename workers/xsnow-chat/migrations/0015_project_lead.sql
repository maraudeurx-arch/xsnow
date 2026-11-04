-- « Chef de projet » (Project Lead) registration: same table and identity protections as arbiters.
-- role: 'arbiter' (default, every existing row) or 'project_lead'. Project leads never see arbitration cases.
-- instructions_*: mandatory, timestamped "I have read and accept the Project Lead instructions" (replaces the Manuel de justice step).
ALTER TABLE arbiters ADD COLUMN role TEXT NOT NULL DEFAULT 'arbiter';
ALTER TABLE arbiters ADD COLUMN instructions_read_at INTEGER;
ALTER TABLE arbiters ADD COLUMN instructions_version TEXT;
