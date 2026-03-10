-- Executive Nucleus: knowledge_staging, executive_subscriptions, executive_metrics_cache
-- Task 1 of Executive Nucleus feature set

BEGIN;

-- ============================================================
-- 1. knowledge_staging (ingestion review pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    source_path TEXT,
    source_type TEXT NOT NULL DEFAULT 'vault_import',
    title TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    edited_content TEXT,
    category TEXT,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending_review',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    content_checksum TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_staging_org_status ON knowledge_staging(org_id, status);
CREATE INDEX idx_knowledge_staging_category ON knowledge_staging(category);

ALTER TABLE knowledge_staging ENABLE ROW LEVEL SECURITY;

-- SELECT: executive roles
CREATE POLICY "knowledge_staging_select_executive"
    ON knowledge_staging FOR SELECT
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );

-- INSERT: platform_admin only
CREATE POLICY "knowledge_staging_insert_admin"
    ON knowledge_staging FOR INSERT
    WITH CHECK (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- UPDATE: platform_admin only
CREATE POLICY "knowledge_staging_update_admin"
    ON knowledge_staging FOR UPDATE
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- DELETE: platform_admin only
CREATE POLICY "knowledge_staging_delete_admin"
    ON knowledge_staging FOR DELETE
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- ============================================================
-- 2. executive_subscriptions (SaaS cost tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS executive_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor TEXT,
    monthly_cost NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    billing_cycle TEXT DEFAULT 'monthly',
    renewal_date DATE,
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exec_subs_org_active ON executive_subscriptions(org_id, is_active);

ALTER TABLE executive_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: executive roles
CREATE POLICY "executive_subscriptions_select_executive"
    ON executive_subscriptions FOR SELECT
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );

-- INSERT: platform_admin only
CREATE POLICY "executive_subscriptions_insert_admin"
    ON executive_subscriptions FOR INSERT
    WITH CHECK (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- UPDATE: platform_admin only
CREATE POLICY "executive_subscriptions_update_admin"
    ON executive_subscriptions FOR UPDATE
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- DELETE: platform_admin only
CREATE POLICY "executive_subscriptions_delete_admin"
    ON executive_subscriptions FOR DELETE
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ? 'platform_admin'
    );

-- ============================================================
-- 3. executive_metrics_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS executive_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,
    metric_value JSONB NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, metric_key)
);

ALTER TABLE executive_metrics_cache ENABLE ROW LEVEL SECURITY;

-- SELECT: executive roles
CREATE POLICY "executive_metrics_cache_select_executive"
    ON executive_metrics_cache FOR SELECT
    USING (
        (auth.jwt() ->> 'krewpact_roles')::jsonb ?| ARRAY['platform_admin', 'executive']
    );

-- No user write policy — service role writes only

-- ============================================================
-- 4. match_knowledge RPC (vector similarity search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
) RETURNS TABLE (
  id uuid,
  doc_id uuid,
  content text,
  chunk_index int,
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT
    ke.id,
    ke.doc_id,
    ke.content,
    ke.chunk_index,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMIT;
