-- Wallet address connected by an arbiter in OPC (via the Connect button). Public address only,
-- never a key. Owner-readable via GET /arbitrage/admin/wallets. No payment is made by the code.
CREATE TABLE IF NOT EXISTS arb_wallets (
  arbiter_id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  chain_id INTEGER,
  connected_at INTEGER NOT NULL
);
