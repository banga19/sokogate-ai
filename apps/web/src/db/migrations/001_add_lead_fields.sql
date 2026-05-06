-- Migration: Add lead enhancement fields
-- Adds support for category classification, payment/shipping tracking, and keyword scoring

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS shipping_tracking_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS keyword_score VARCHAR(10),
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'chat';

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
CREATE INDEX IF NOT EXISTS idx_leads_shipping_status ON leads(shipping_status);
