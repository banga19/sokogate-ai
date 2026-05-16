-- ============================================
-- 3. SALES PROSPECTS TABLE
-- Tracks B2B sales leads (construction companies, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS sales_prospects (
  id SERIAL PRIMARY KEY,
  company VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  tier VARCHAR(10) NOT NULL DEFAULT 'T2' CHECK (tier IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9')),
  location VARCHAR(100),
  annual_spend_kes BIGINT,
  pain_point TEXT,
  engagement_angle TEXT,
  decision_maker_title VARCHAR(200),
  status VARCHAR(20) DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Responded', 'Negotiating', 'Closed Won', 'Closed Lost')),
  next_action_date DATE,
  last_contact_date DATE,
  notes TEXT,
  source VARCHAR(20) DEFAULT 'sales-assets',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. INVESTORS TABLE
-- Tracks fundraising targets and pipeline
-- ============================================
CREATE TABLE IF NOT EXISTS investors (
  id SERIAL PRIMARY KEY,
  investor_name VARCHAR(200) NOT NULL,
  fund_name VARCHAR(200),
  tier VARCHAR(10) DEFAULT 'T2' CHECK (tier IN ('T1', 'T2', 'T3', 'T4', 'T5', 'T6')),
  ticket_size_usd_min INTEGER,
  ticket_size_usd_max INTEGER,
  geographic_focus VARCHAR(200),
  investment_thesis TEXT,
  contact_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  decision_timeline_weeks INTEGER,
  first_contact_date DATE,
  status VARCHAR(20) DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'Contacted', 'Meeting Scheduled', 'Pitched', 'Due Diligence', 'Term Sheet', 'Closed', 'Declined')),
  meetings_count INTEGER DEFAULT 0,
  term_sheet_date DATE,
  amount_committed_usd INTEGER,
  valuation_pre_money_usd INTEGER,
  notes TEXT,
  source VARCHAR(20) DEFAULT 'funding-assets',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. PARTNERSHIPS TABLE
-- Tracks West Africa distribution partners
-- ============================================
CREATE TABLE IF NOT EXISTS partnerships (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  tier VARCHAR(10) DEFAULT 'T1' CHECK (tier IN ('T1', 'T2', 'T3', 'T4', 'T5')),
  contact_name VARCHAR(200),
  title VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(50),
  capability TEXT,
  interest_level VARCHAR(20) DEFAULT 'Not Contacted' CHECK (interest_level IN ('Not Contacted', 'Contacted', 'Interested', 'Negotiating', 'Pilot', 'Active', 'Inactive')),
  status VARCHAR(20) DEFAULT 'Prospecting' CHECK (status IN ('Prospecting', 'Discovery Call', 'Proposal Sent', 'Negotiation', 'Agreement Signed', 'Pilot Active', 'Live', 'Closed Lost')),
  first_contact_date DATE,
  discovery_call_date DATE,
  proposal_sent_date DATE,
  proposal_signed_date DATE,
  pilot_start_date DATE,
  revenue_model VARCHAR(100),
  monthly_revenue_potential_usd INTEGER,
  actual_monthly_revenue_usd INTEGER,
  notes TEXT,
  source VARCHAR(20) DEFAULT 'partnerships-assets',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. WEEKLY METRICS TABLE
-- Tracks KPI progress against 30-day plan
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_metrics (
  id SERIAL PRIMARY KEY,
  week_number INTEGER NOT NULL,
  date_range VARCHAR(20),
  metric_name VARCHAR(200) NOT NULL,
  target_value NUMERIC,
  actual_value NUMERIC,
  unit VARCHAR(20) DEFAULT 'count',
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Missed', 'Overachieved')),
  notes TEXT,
  recorded_at DATE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a unique constraint to prevent duplicate metric entries per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_metrics_unique ON weekly_metrics(week_number, metric_name);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- Sales prospects indexes
CREATE INDEX IF NOT EXISTS idx_prospects_tier ON sales_prospects(tier);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON sales_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_company ON sales_prospects(company);
CREATE INDEX IF NOT EXISTS idx_prospects_location ON sales_prospects(location);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON sales_prospects(created_at DESC);

-- Investors indexes
CREATE INDEX IF NOT EXISTS idx_investors_tier ON investors(tier);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);
CREATE INDEX IF NOT EXISTS idx_investors_fund_name ON investors(fund_name);
CREATE INDEX IF NOT EXISTS idx_investors_created_at ON investors(created_at DESC);

-- Partnerships indexes
CREATE INDEX IF NOT EXISTS idx_partnerships_country ON partnerships(country);
CREATE INDEX IF NOT EXISTS idx_partnerships_tier ON partnerships(tier);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);
CREATE INDEX IF NOT EXISTS idx_partnerships_company ON partnerships(company_name);
CREATE INDEX IF NOT EXISTS idx_partnerships_created_at ON partnerships(created_at DESC);

-- Weekly metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_week ON weekly_metrics(week_number);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON weekly_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_status ON weekly_metrics(status);
CREATE INDEX IF NOT EXISTS idx_metrics_created_at ON weekly_metrics(created_at DESC);

-- ============================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================
-- First, create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sales_prospects_updated_at ON sales_prospects;
CREATE TRIGGER update_sales_prospects_updated_at
  BEFORE UPDATE ON sales_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investors_updated_at ON investors;
CREATE TRIGGER update_investors_updated_at
  BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partnerships_updated_at ON partnerships;
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_metrics_updated_at ON weekly_metrics;
CREATE TRIGGER update_weekly_metrics_updated_at
  BEFORE UPDATE ON weekly_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to load test data from CSVs:
-- \copy sales_prospects FROM '/home/apop/sales-and-funding-assets/TRACKER-PROSPECTS.csv' WITH CSV HEADER;
-- \copy investors FROM '/home/apop/sales-and-funding-assets/TRACKER-INVESTORS.csv' WITH CSV HEADER;
-- \copy partnerships FROM '/home/apop/sales-and-funding-assets/TRACKER-PARTNERSHIPS.csv' WITH CSV HEADER;
