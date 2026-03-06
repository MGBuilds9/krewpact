-- Bidding Opportunities table for CRM
-- Tracks bids from MERX, Bids & Tenders, manual entry, and referrals

CREATE TYPE bidding_source AS ENUM ('merx', 'bids_tenders', 'manual', 'referral');
CREATE TYPE bidding_status AS ENUM ('new', 'reviewing', 'bidding', 'submitted', 'won', 'lost', 'expired');

CREATE TABLE IF NOT EXISTS bidding_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  division_id UUID REFERENCES divisions(id),
  title TEXT NOT NULL,
  source bidding_source NOT NULL DEFAULT 'manual',
  url TEXT,
  deadline TIMESTAMPTZ,
  estimated_value NUMERIC(15,2),
  status bidding_status NOT NULL DEFAULT 'new',
  assigned_to UUID,
  opportunity_id UUID REFERENCES opportunities(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bidding_opportunities_org ON bidding_opportunities(org_id);
CREATE INDEX idx_bidding_opportunities_status ON bidding_opportunities(status);
CREATE INDEX idx_bidding_opportunities_deadline ON bidding_opportunities(deadline);
CREATE INDEX idx_bidding_opportunities_division ON bidding_opportunities(division_id);

-- RLS
ALTER TABLE bidding_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bidding opportunities in their org" ON bidding_opportunities
  FOR SELECT USING (
    org_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'krewpact_org_id')
  );

CREATE POLICY "Users can insert bidding opportunities in their org" ON bidding_opportunities
  FOR INSERT WITH CHECK (
    org_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'krewpact_org_id')
  );

CREATE POLICY "Users can update bidding opportunities in their org" ON bidding_opportunities
  FOR UPDATE USING (
    org_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'krewpact_org_id')
  );

CREATE POLICY "Users can delete bidding opportunities in their org" ON bidding_opportunities
  FOR DELETE USING (
    org_id::text = (current_setting('request.jwt.claims', true)::jsonb ->> 'krewpact_org_id')
  );

-- Updated_at trigger
CREATE TRIGGER set_bidding_opportunities_updated_at
  BEFORE UPDATE ON bidding_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
