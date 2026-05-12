-- Analytics Events Table
-- Stores batched analytics events for later aggregation and analysis

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite ON analytics_events(visitor_id, event_type, created_at DESC);

-- Optional: Partitioning by month for large datasets (PostgreSQL 10+)
-- CREATE TABLE analytics_events_2026_05 PARTITION OF analytics_events
--   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Row Level Security (optional, if using Supabase/PostgreSQL with RLS)
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
