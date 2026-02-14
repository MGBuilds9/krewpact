-- KrewPact Migration 00003: Sales AGI (LeadForge Merge)
-- Purpose: Merging LeadForge capabilities (Leads, Outreach, Scoring, Automation) into KrewPact
-- Adapted from LeadForge-MDM-Group/supabase_schema_v3_automation.sql

BEGIN;

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =========================
-- TYPES & ENUMS
-- =========================
-- Ensure these types exist or are created if specific to this module
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurture');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE nurture_status AS ENUM ('pool', 'flash_response', 'active_sprint', 'long_drip', 'disqualified');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outreach_channel AS ENUM ('email', 'call', 'linkedin', 'video', 'meeting', 'text', 'site_visit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================
-- SALES AGI TABLES
-- =========================

-- 1. Leads Table (The Core Entity)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    company_name TEXT NOT NULL,
    domain TEXT,
    industry TEXT, -- 'healthcare', 'retail', 'hospitality', etc.
    
    -- MDM Division Routing (References KrewPact divisions UUID)
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Source Tracking
    source_channel TEXT NOT NULL, -- 'apollo', 'maps', 'linkedin', 'inbound', 'referral', 'bidding_platform'
    source_detail TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    -- Status
    status lead_status NOT NULL DEFAULT 'new',
    lost_reason TEXT,
    nurture_status nurture_status DEFAULT 'pool',
    
    -- Scoring
    lead_score INTEGER DEFAULT 0,
    fit_score INTEGER DEFAULT 0,
    intent_score INTEGER DEFAULT 0,
    engagement_score INTEGER DEFAULT 0,
    
    -- Project/Opportunity Details
    project_type TEXT,
    project_description TEXT,
    estimated_value NUMERIC(12,2),
    estimated_sqft INTEGER,
    timeline_urgency TEXT, -- 'immediate', '1-3_months', etc.
    decision_date DATE,
    
    -- Location
    address TEXT,
    city TEXT,
    province TEXT DEFAULT 'Ontario',
    postal_code TEXT,
    
    -- Qualification
    is_qualified BOOLEAN DEFAULT FALSE,
    qualified_at TIMESTAMPTZ,
    qualified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    disqualified_reason TEXT,
    
    -- Automation Linkage
    current_sequence_id UUID, -- FK added later after sequences table
    sequence_step INTEGER DEFAULT 0,
    last_automation_at TIMESTAMPTZ,
    automation_paused BOOLEAN DEFAULT FALSE,
    
    -- Deduplication
    external_id TEXT,
    domain_hash TEXT GENERATED ALWAYS AS (MD5(LOWER(COALESCE(domain, '')))) STORED,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_touch_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_leads_domain_hash ON leads(domain_hash);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_division ON leads(division_id);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(lead_score DESC);

-- 2. Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Identity
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    
    -- Role
    title TEXT,
    role TEXT, -- 'decision_maker', 'influencer', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    is_decision_maker BOOLEAN DEFAULT FALSE,
    
    -- Social
    linkedin_url TEXT,
    
    -- Preferences
    email_opted_in BOOLEAN DEFAULT TRUE,
    phone_opted_in BOOLEAN DEFAULT TRUE,
    preferred_channel TEXT,
    
    -- Stats
    last_contacted_at TIMESTAMPTZ,
    total_touches INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_lead ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- 3. Sequences (Automation)
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sequence Steps
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    action_type TEXT NOT NULL, -- 'email', 'task', 'wait'
    action_config JSONB NOT NULL,
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Outreach Log (Activity)
CREATE TABLE IF NOT EXISTS outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    channel outreach_channel NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    activity_type TEXT,
    
    outcome TEXT,
    outcome_detail TEXT,
    
    subject TEXT,
    message_preview TEXT,
    notes TEXT,
    
    sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
    sequence_step INTEGER,
    is_automated BOOLEAN DEFAULT FALSE,
    
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach(lead_id);

-- 6. Scoring Rules
CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fit', 'intent', 'engagement')),
    field_name TEXT NOT NULL,
    operator TEXT NOT NULL,
    value TEXT NOT NULL,
    score_impact INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    category TEXT,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    variables JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Lead Score History
CREATE TABLE IF NOT EXISTS lead_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    lead_score INTEGER,
    fit_score INTEGER,
    intent_score INTEGER,
    engagement_score INTEGER,
    triggered_by TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Sequence Enrollments
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    next_step_at TIMESTAMPTZ,
    
    UNIQUE(sequence_id, lead_id)
);

-- Add references back to leads for sequence
ALTER TABLE leads ADD CONSTRAINT fk_leads_sequence FOREIGN KEY (current_sequence_id) REFERENCES sequences(id) ON DELETE SET NULL;

-- =========================
-- TRIGGERS
-- =========================

-- Updated At Trigger
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sequences_updated_at BEFORE UPDATE ON sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Scoring Trigger (Simplified)
CREATE OR REPLACE FUNCTION calculate_lead_score() RETURNS TRIGGER AS $$
BEGIN
    NEW.lead_score = LEAST(100, GREATEST(0, 
        (COALESCE(NEW.fit_score, 0) + COALESCE(NEW.intent_score, 0) + COALESCE(NEW.engagement_score, 0)) / 3
    ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_score_trigger BEFORE INSERT OR UPDATE OF fit_score, intent_score, engagement_score ON leads
    FOR EACH ROW EXECUTE FUNCTION calculate_lead_score();

-- =========================
-- RLS POLICIES (Permissive for Phase 1)
-- =========================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all access to contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all access to outreach" ON outreach FOR ALL USING (true);
CREATE POLICY "Allow all access to sequences" ON sequences FOR ALL USING (true);
CREATE POLICY "Allow all access to scoring_rules" ON scoring_rules FOR ALL USING (true);
CREATE POLICY "Allow all access to email_templates" ON email_templates FOR ALL USING (true);

COMMIT;
