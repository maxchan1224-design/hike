PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  category TEXT,
  venue TEXT,
  organizer TEXT,
  price TEXT,
  date_text TEXT,
  time_text TEXT,
  event_url TEXT NOT NULL,
  image_url TEXT,
  verification TEXT NOT NULL CHECK(verification IN ('official_feed','official_page','pending')),
  visibility TEXT NOT NULL CHECK(visibility IN ('verified','pending','missing_official_feed','cancelled')),
  last_seen_run TEXT,
  missed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(source,source_event_id)
);
CREATE INDEX IF NOT EXISTS events_by_source ON events(source,visibility);
CREATE TABLE IF NOT EXISTS event_dates (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  last_seen_run TEXT NOT NULL,
  PRIMARY KEY(event_id,day)
);
CREATE INDEX IF NOT EXISTS event_dates_by_day ON event_dates(day,event_id);
CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  parsed_events INTEGER,
  published_events INTEGER,
  error TEXT
);
-- Social posts are leads, not verified activities. No public API exposes this table.
CREATE TABLE IF NOT EXISTS activity_leads (
  id TEXT PRIMARY KEY,
  source_platform TEXT NOT NULL,
  post_url TEXT NOT NULL UNIQUE,
  organizer_official_url TEXT,
  organizer_verified INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  collected_at TEXT NOT NULL
);
