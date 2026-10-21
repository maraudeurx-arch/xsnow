-- Arbiter contact email, AES-GCM encrypted with ARBITER_ENC_KEY (like identity), kept separate from
-- identity_enc so the ID purge does not remove it. email_lang = fr|en|es for the decision copy.
ALTER TABLE arbiters ADD COLUMN email_enc TEXT;
ALTER TABLE arbiters ADD COLUMN email_lang TEXT;
