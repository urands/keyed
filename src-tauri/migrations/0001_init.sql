-- Schema from docs/architecture.md ("Хранилище"). Migrations only ever add; never edit a released one.

CREATE TABLE profile (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Version 1 has one profile; every table already has profile_id.
INSERT INTO profile (id, name, created_at) VALUES (1, '', CAST(strftime('%s', 'now') AS INTEGER) * 1000);

CREATE TABLE settings (
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  key TEXT NOT NULL,
  value TEXT NOT NULL, -- JSON
  PRIMARY KEY (profile_id, key)
);

CREATE TABLE lesson (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  layout_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  started_at INTEGER NOT NULL, -- ms since 1970
  duration_ms INTEGER NOT NULL,
  length INTEGER NOT NULL,
  errors INTEGER NOT NULL,
  cpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  -- Every typed position, in order: [char, time ms or null, wrong chars typed].
  -- key_stat can be rebuilt from these if the formulas change.
  samples_json TEXT NOT NULL
);

CREATE INDEX lesson_by_layout ON lesson (profile_id, layout_id, started_at);

CREATE TABLE key_stat (
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  layout_id TEXT NOT NULL,
  key TEXT NOT NULL,
  hits INTEGER NOT NULL,
  misses INTEGER NOT NULL,
  time_ema REAL,
  acc_ema REAL,
  best_confidence REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (profile_id, layout_id, key)
);

-- How many key groups of each course stage are open.
CREATE TABLE course_progress (
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  layout_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  opened INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (profile_id, layout_id, stage)
);

CREATE TABLE daily (
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  date TEXT NOT NULL, -- YYYY-MM-DD, local time
  active_ms INTEGER NOT NULL,
  lessons INTEGER NOT NULL,
  chars INTEGER NOT NULL,
  goal_met INTEGER NOT NULL,
  freeze_used INTEGER NOT NULL,
  PRIMARY KEY (profile_id, date)
);

CREATE TABLE achievement (
  profile_id INTEGER NOT NULL REFERENCES profile (id),
  id TEXT NOT NULL,
  level INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (profile_id, id)
);
