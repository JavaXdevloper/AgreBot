-- Agri Rover Database Schema (Version 1)
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_sessions (
  id TEXT PRIMARY KEY,                       -- UUID
  started_at TEXT NOT NULL,                  -- UTC ISO 8601
  ended_at TEXT NULL,
  source_mode TEXT NOT NULL CHECK (source_mode IN ('live','replay')),
  end_reason TEXT NULL,                      -- 'disconnect','replay_stop','shutdown','unclean_shutdown'
  notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS detections (
  id TEXT PRIMARY KEY,                       -- UUID
  session_id TEXT NULL REFERENCES inspection_sessions(id),
  detected_at TEXT NOT NULL,
  label TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  class_id INTEGER NULL,
  bbox_json TEXT NULL,                       -- {"x","y","width","height","unit":"px"} or NULL
  source_mode TEXT NOT NULL CHECK (source_mode IN ('live','replay')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_det_time   ON detections(detected_at);
CREATE INDEX IF NOT EXISTS idx_det_label  ON detections(label);
CREATE INDEX IF NOT EXISTS idx_det_mode   ON detections(source_mode);
CREATE INDEX IF NOT EXISTS idx_det_sess   ON detections(session_id);

CREATE TABLE IF NOT EXISTS system_events (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  component TEXT NOT NULL,                   -- camera, model, serial, database, auth, replay, system
  message TEXT NOT NULL,
  details_json TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_evt_time ON system_events(occurred_at);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id TEXT PRIMARY KEY,
  recorded_at TEXT NOT NULL,
  sensor_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NULL,
  status TEXT NOT NULL
);
