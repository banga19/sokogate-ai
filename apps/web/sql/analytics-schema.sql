-- Sokogate AI Chatbot - Analytics Database Schema
-- Run this script in your PostgreSQL database to enable analytics tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Analytics Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying (analytics queries need to be fast)
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Composite index for common queries (visitor + event type + date)
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite
  ON analytics_events(visitor_id, event_type, created_at DESC);

-- Partial index for lead_captured events (most queried)
CREATE INDEX IF NOT EXISTS idx_analytics_lead_captured
  ON analytics_events(visitor_id, created_at DESC)
  WHERE event_type = 'lead_captured';

-- ============================================
-- Table: lead_score_history (optional)
-- Track score changes over time for a visitor
-- ============================================
CREATE TABLE IF NOT EXISTS lead_score_history (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(100) NOT NULL,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  score VARCHAR(10) NOT NULL, -- 'High', 'Medium', 'Low'
  category VARCHAR(100),
  previous_score VARCHAR(10),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_score_visitor ON lead_score_history(visitor_id);
CREATE INDEX IF NOT EXISTS idx_lead_score_created ON lead_score_history(created_at DESC);

-- ============================================
-- Table: chat_session_metrics (aggregated per session)
-- Pre-computed metrics to avoid scanning all events
-- ============================================
CREATE TABLE IF NOT EXISTS chat_session_metrics (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(100) NOT NULL UNIQUE,
  session_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  session_ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  lead_captured BOOLEAN DEFAULT FALSE,
  feedback_rating INTEGER,
  handoff_requested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_metrics_visitor ON chat_session_metrics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_session_metrics_started ON chat_session_metrics(session_started_at DESC);

-- ============================================
-- Function: Update chat_session_metrics trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_session_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Upsert session metrics on each event
  INSERT INTO chat_session_metrics (visitor_id, session_started_at, message_count)
  VALUES (NEW.visitor_id, NEW.created_at, 1)
  ON CONFLICT (visitor_id) DO UPDATE
  SET message_count = chat_session_metrics.message_count + 1,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on analytics_events (optional, can be expensive)
-- Uncomment if you want real-time session metrics:
-- CREATE TRIGGER trg_update_session_metrics
--   AFTER INSERT ON analytics_events
--   FOR EACH ROW
--   WHEN (NEW.event_type = 'message_sent')
--   EXECUTE FUNCTION update_session_metrics();

-- ============================================
-- Views for easy reporting
-- ============================================

-- Daily summary view
CREATE OR REPLACE VIEW daily_analytics_summary AS
SELECT
  DATE(created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM analytics_events
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_count DESC;

-- Conversion funnel view (daily)
CREATE OR REPLACE VIEW daily_conversion_funnel AS
SELECT
  DATE(created_at) as date,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_started' THEN visitor_id END) as chats_started,
  COUNT(DISTINCT CASE WHEN event_type = 'lead_captured' THEN visitor_id END) as leads_captured,
  COUNT(DISTINCT CASE WHEN event_type = 'human_handoff_requested' THEN visitor_id END) as handoffs_requested,
  COUNT(DISTINCT CASE WHEN event_type = 'feedback_submitted' THEN visitor_id END) as feedback_given
FROM analytics_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- Maintenance: Data retention policy (optional)
-- Delete analytics events older than 90 days to manage storage
-- ============================================
-- CREATE OR REPLACE FUNCTION cleanup_old_analytics()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM analytics_events
--   WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;
--
-- -- Schedule with pg_cron (if installed):
-- -- SELECT cron.schedule('cleanup-analytics', '0 3 * * *', 'SELECT cleanup_old_analytics()');

-- ============================================
-- Row Level Security (RLS) - Optional
-- If using Supabase or need per-tenant isolation
-- ============================================
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow admin full access" ON analytics_events FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- Grant permissions (adjust for your setup)
-- ============================================
-- GRANT SELECT, INSERT ON analytics_events TO authenticated_user_role;

-- ============================================
-- Query Examples for Reference
-- ============================================
/*
-- Get total events by type for last 7 days
SELECT event_type, COUNT(*) as count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;

-- Get funnel conversion rate
SELECT
  COUNT(DISTINCT CASE WHEN event_type = 'chat_started' THEN visitor_id END) as chats,
  COUNT(DISTINCT CASE WHEN event_type = 'lead_captured' THEN visitor_id END) as leads,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'lead_captured' THEN visitor_id END)::numeric /
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'chat_started' THEN visitor_id END), 0) * 100,
    2
  ) as conversion_rate_pct
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Get visitor journey (all events for one visitor)
SELECT event_type, created_at, event_data
FROM analytics_events
WHERE visitor_id = 'vis_abc123'
ORDER BY created_at ASC;

-- Find high-value leads (High score from last week)
SELECT DISTINCT ON (visitor_id) visitor_id, event_data->>'score' as score, event_data->>'category' as category, created_at
FROM analytics_events
WHERE event_type = 'lead_captured'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY visitor_id, created_at DESC;
*/

-- ============================================
-- Installation Complete
-- ============================================
COMMIT;

-- Verify
SELECT 'Analytics schema installed successfully!' as status;
