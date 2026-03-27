-- Migration: Fix overly permissive RLS on knowledge_embeddings
--
-- The original migration (20260212220000_knowledge_vector.sql) created a
-- catch-all write policy flagged as temporary "during setup". That policy
-- allowed any authenticated user to INSERT/UPDATE/DELETE embeddings.
-- All embedding ingestion goes through the service client (createServiceClient),
-- so no user-facing INSERT policy is required. Restrict writes to service_role only.
--
-- SELECT policy ("Allow all read access to knowledge_embeddings") is unchanged.

BEGIN;

-- Drop the overly permissive ALL policy
DROP POLICY IF EXISTS "Allow all write access to knowledge_embeddings" ON knowledge_embeddings;

-- Drop the equivalent write policies on knowledge_docs (same original migration,
-- same temporary flag — apply the same fix for consistency)
DROP POLICY IF EXISTS "Allow all write access to knowledge_docs" ON knowledge_docs;

-- knowledge_embeddings: service_role-only INSERT
-- UPDATE and DELETE are also restricted to service_role (no user-facing mutations needed)
CREATE POLICY "knowledge_embeddings_service_insert"
  ON knowledge_embeddings
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "knowledge_embeddings_service_update"
  ON knowledge_embeddings
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "knowledge_embeddings_service_delete"
  ON knowledge_embeddings
  FOR DELETE
  TO service_role
  USING (true);

-- knowledge_docs: service_role-only writes (same reasoning)
CREATE POLICY "knowledge_docs_service_insert"
  ON knowledge_docs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "knowledge_docs_service_update"
  ON knowledge_docs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "knowledge_docs_service_delete"
  ON knowledge_docs
  FOR DELETE
  TO service_role
  USING (true);

COMMIT;
