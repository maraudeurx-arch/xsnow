-- "Red" arbiter: 3 simulated answers contradicting Indiana's suggestion (since the last clear).
-- Blocks real cases until the training is completed and the owner clears the flag. No data deleted.
ALTER TABLE arbiters ADD COLUMN red_flag INTEGER NOT NULL DEFAULT 0;
ALTER TABLE arbiters ADD COLUMN red_at INTEGER;
ALTER TABLE arbiters ADD COLUMN red_cleared_at INTEGER;
