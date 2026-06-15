CREATE TABLE IF NOT EXISTS check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  checked_at INTEGER NOT NULL,
  up INTEGER NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER NOT NULL,
  error_message TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitor_states (
  monitor_id TEXT PRIMARY KEY,
  up INTEGER NOT NULL,
  last_checked_at INTEGER,
  last_status_code INTEGER,
  last_response_time_ms INTEGER,
  last_error_message TEXT,
  last_notified_status TEXT,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  resolved_at INTEGER,
  error_message TEXT,
  status_code INTEGER,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_check_results_monitor_time ON check_results (monitor_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_started ON incidents (monitor_id, started_at DESC);
