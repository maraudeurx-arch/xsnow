-- Onboarding checklist: when the arbiter confirmed reading the Manuel de justice ("J'ai lu le Manuel").
-- The other checklist items are derived from existing data (email_enc, arb_push_subs, arb_wallets, face_*, arb_sim_answers).
ALTER TABLE arbiters ADD COLUMN manual_read_at INTEGER;
