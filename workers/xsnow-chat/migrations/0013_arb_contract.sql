-- 7th checklist step: arbiter agreement acceptance (e-signature: checkbox + timestamp + version + SHA-256 of the text).
ALTER TABLE arbiters ADD COLUMN contract_accepted_at INTEGER;
ALTER TABLE arbiters ADD COLUMN contract_version TEXT;
ALTER TABLE arbiters ADD COLUMN contract_hash TEXT;
