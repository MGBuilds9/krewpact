-- Multi-tenancy: Add org_id to knowledge layer tables.
-- Scopes knowledge_docs, ai_chat_sessions, and downstream tables by org.
-- Updates match_knowledge RPC to accept optional org_id filter.
-- Backfills existing rows from the single production org.

BEGIN;

-- ============================================================
-- 1. Add org_id columns (nullable initially for backfill)
-- ============================================================

ALTER TABLE knowledge_docs
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

ALTER TABLE ai_chat_sessions
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id);

-- ============================================================
-- 2. Backfill from single production org
-- ============================================================

UPDATE knowledge_docs
  SET org_id = (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)
  WHERE org_id IS NULL;

UPDATE ai_chat_sessions
  SET org_id = (SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1)
  WHERE org_id IS NULL;

-- ============================================================
-- 3. Set NOT NULL + add indexes
-- ============================================================

ALTER TABLE knowledge_docs ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE ai_chat_sessions ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_org_id ON knowledge_docs(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_org_id ON ai_chat_sessions(org_id);

-- ============================================================
-- 4. Replace UNIQUE(file_path) → UNIQUE(org_id, file_path)
-- ============================================================

ALTER TABLE knowledge_docs DROP CONSTRAINT IF EXISTS knowledge_docs_file_path_key;
ALTER TABLE knowledge_docs
  ADD CONSTRAINT knowledge_docs_org_file_path_key UNIQUE (org_id, file_path);

-- ============================================================
-- 5. Update RLS policies — scope reads by org_id
-- ============================================================

-- 5a. knowledge_docs: authenticated reads scoped to caller's org
DROP POLICY IF EXISTS knowledge_docs_auth_select ON knowledge_docs;
CREATE POLICY knowledge_docs_select_org ON knowledge_docs
  FOR SELECT TO authenticated
  USING (org_id = krewpact_org_id()::uuid);

-- Keep service_role write policy (unchanged)
-- knowledge_docs_service_write already allows ALL TO service_role

-- 5b. knowledge_embeddings: scope via JOIN to knowledge_docs.org_id
DROP POLICY IF EXISTS knowledge_embeddings_auth_select ON knowledge_embeddings;
CREATE POLICY knowledge_embeddings_select_org ON knowledge_embeddings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_docs kd
      WHERE kd.id = knowledge_embeddings.doc_id
        AND kd.org_id = krewpact_org_id()::uuid
    )
  );

-- Keep service_role write policy (unchanged)
-- knowledge_embeddings_service_write already allows ALL TO service_role

-- 5c. ai_chat_sessions: add org scope alongside user scope
DROP POLICY IF EXISTS "ai_chat_sessions_select_own" ON ai_chat_sessions;
CREATE POLICY ai_chat_sessions_select_org ON ai_chat_sessions
  FOR SELECT TO authenticated
  USING (
    org_id = krewpact_org_id()::uuid
    AND user_id = (auth.jwt() ->> 'krewpact_user_id')::uuid
  );

DROP POLICY IF EXISTS "ai_chat_sessions_insert_own" ON ai_chat_sessions;
CREATE POLICY ai_chat_sessions_insert_org ON ai_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (org_id = krewpact_org_id()::uuid);

-- 5d. ai_chat_messages: update subquery to include org scope
-- Messages inherit org scope from their session's org_id
DROP POLICY IF EXISTS "ai_chat_messages_select_own" ON ai_chat_messages;
CREATE POLICY ai_chat_messages_select_org ON ai_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
        AND s.org_id = krewpact_org_id()::uuid
        AND s.user_id = (auth.jwt() ->> 'krewpact_user_id')::uuid
    )
  );

DROP POLICY IF EXISTS "ai_chat_messages_insert_own" ON ai_chat_messages;
CREATE POLICY ai_chat_messages_insert_org ON ai_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions s
      WHERE s.id = ai_chat_messages.session_id
        AND s.org_id = krewpact_org_id()::uuid
    )
  );

-- ============================================================
-- 6. Update match_knowledge RPC — add optional p_org_id filter
-- ============================================================

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_org_id uuid DEFAULT NULL
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
  JOIN knowledge_docs kd ON kd.id = ke.doc_id
  WHERE 1 - (ke.embedding <=> query_embedding) > match_threshold
    AND (p_org_id IS NULL OR kd.org_id = p_org_id)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Set search_path for security (matches existing pattern from 20260328)
ALTER FUNCTION public.match_knowledge SET search_path = public, pg_temp;

COMMIT;
