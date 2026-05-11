-- ============================================
-- 000_TRIGGERS - Shared trigger functions
-- ============================================
-- This must run BEFORE any migration that references these functions

-- Trigger function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
