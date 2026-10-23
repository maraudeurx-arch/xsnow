-- Face rescan for an already VERIFIED arbiter: flag only, status and access stay "verified".
ALTER TABLE arbiters ADD COLUMN rescan_requested_at INTEGER;
