CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  expected_status INTEGER NOT NULL DEFAULT 200,
  timeout_ms INTEGER NOT NULL DEFAULT 5000,
  interval_minutes INTEGER NOT NULL DEFAULT 5,
  enabled INTEGER NOT NULL DEFAULT 1,
  telegram_enabled INTEGER NOT NULL DEFAULT 0,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  public_slug TEXT NOT NULL UNIQUE,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monitors_user ON monitors (user_id, project, name);
CREATE INDEX IF NOT EXISTS idx_monitors_public_slug ON monitors (public_slug);
