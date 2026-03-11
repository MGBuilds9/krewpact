-- Migration: Update JWT claim paths for Clerk Third-Party Auth
-- Old approach: JWT template with claims at top level (krewpact_user_id, krewpact_divisions, krewpact_roles)
-- New approach: Session token with claims nested under 'metadata' key from user.public_metadata
--
-- Context: Clerk deprecated the JWT template approach. Supabase now supports Clerk as a
-- Third-Party Auth provider, verifying JWTs via JWKS instead of shared secrets.
-- Session tokens include public_metadata under the custom 'metadata' claim key.

-- ============================================================
-- 1. UPDATE HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.krewpact_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json -> 'metadata' ->> 'krewpact_user_id',
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_divisions() RETURNS jsonb
  LANGUAGE sql STABLE
  AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'metadata' -> 'division_ids')::jsonb,
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_roles() RETURNS jsonb
  LANGUAGE sql STABLE
  AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'metadata' -> 'role_keys')::jsonb,
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.krewpact_org_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json -> 'metadata' ->> 'krewpact_org_id',
    (SELECT id::text FROM organizations WHERE slug = 'default' LIMIT 1),
    ''
  );
$$;

-- ============================================================
-- 2. UPDATE DIRECT POLICIES — ai_chat_messages
-- ============================================================

DROP POLICY IF EXISTS "ai_chat_messages_select_own" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages_select_own" ON ai_chat_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM ai_chat_sessions
    WHERE (user_id)::text = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id')
  ));

DROP POLICY IF EXISTS "ai_chat_messages_insert_own" ON ai_chat_messages;
CREATE POLICY "ai_chat_messages_insert_own" ON ai_chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM ai_chat_sessions
    WHERE (user_id)::text = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id')
  ));

-- ============================================================
-- 3. UPDATE DIRECT POLICIES — ai_chat_sessions
-- ============================================================

DROP POLICY IF EXISTS "ai_chat_sessions_select_own" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions_select_own" ON ai_chat_sessions FOR SELECT
  USING (
    (user_id)::text = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id')
    AND (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'executive']
  );

DROP POLICY IF EXISTS "ai_chat_sessions_insert_own" ON ai_chat_sessions;
CREATE POLICY "ai_chat_sessions_insert_own" ON ai_chat_sessions FOR INSERT
  WITH CHECK (
    (user_id)::text = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id')
    AND (auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'executive']
  );

-- ============================================================
-- 4. UPDATE DIRECT POLICIES — crm_saved_views
-- ============================================================

DROP POLICY IF EXISTS "crm_saved_views_select" ON crm_saved_views;
CREATE POLICY "crm_saved_views_select" ON crm_saved_views FOR SELECT
  USING (user_id = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id'));

DROP POLICY IF EXISTS "crm_saved_views_insert" ON crm_saved_views;
CREATE POLICY "crm_saved_views_insert" ON crm_saved_views FOR INSERT
  WITH CHECK (user_id = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id'));

DROP POLICY IF EXISTS "crm_saved_views_update" ON crm_saved_views;
CREATE POLICY "crm_saved_views_update" ON crm_saved_views FOR UPDATE
  USING (user_id = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id'));

DROP POLICY IF EXISTS "crm_saved_views_delete" ON crm_saved_views;
CREATE POLICY "crm_saved_views_delete" ON crm_saved_views FOR DELETE
  USING (user_id = (auth.jwt() -> 'metadata' ->> 'krewpact_user_id'));

-- ============================================================
-- 5-7. UPDATE DIRECT POLICIES — executive + knowledge
-- ============================================================

DROP POLICY IF EXISTS "executive_metrics_cache_select_executive" ON executive_metrics_cache;
CREATE POLICY "executive_metrics_cache_select_executive" ON executive_metrics_cache FOR SELECT
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'executive']);

DROP POLICY IF EXISTS "executive_subscriptions_select_executive" ON executive_subscriptions;
CREATE POLICY "executive_subscriptions_select_executive" ON executive_subscriptions FOR SELECT
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'executive']);

DROP POLICY IF EXISTS "executive_subscriptions_insert_admin" ON executive_subscriptions;
CREATE POLICY "executive_subscriptions_insert_admin" ON executive_subscriptions FOR INSERT
  WITH CHECK ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

DROP POLICY IF EXISTS "executive_subscriptions_update_admin" ON executive_subscriptions;
CREATE POLICY "executive_subscriptions_update_admin" ON executive_subscriptions FOR UPDATE
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

DROP POLICY IF EXISTS "executive_subscriptions_delete_admin" ON executive_subscriptions;
CREATE POLICY "executive_subscriptions_delete_admin" ON executive_subscriptions FOR DELETE
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

DROP POLICY IF EXISTS "knowledge_staging_select_executive" ON knowledge_staging;
CREATE POLICY "knowledge_staging_select_executive" ON knowledge_staging FOR SELECT
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ?| ARRAY['platform_admin', 'executive']);

DROP POLICY IF EXISTS "knowledge_staging_insert_admin" ON knowledge_staging;
CREATE POLICY "knowledge_staging_insert_admin" ON knowledge_staging FOR INSERT
  WITH CHECK ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

DROP POLICY IF EXISTS "knowledge_staging_update_admin" ON knowledge_staging;
CREATE POLICY "knowledge_staging_update_admin" ON knowledge_staging FOR UPDATE
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

DROP POLICY IF EXISTS "knowledge_staging_delete_admin" ON knowledge_staging;
CREATE POLICY "knowledge_staging_delete_admin" ON knowledge_staging FOR DELETE
  USING ((auth.jwt() -> 'metadata' -> 'role_keys')::jsonb ? 'platform_admin');

-- ============================================================
-- 8. UPDATE DIRECT POLICIES — bidding_opportunities
-- ============================================================

DROP POLICY IF EXISTS "Users can view bidding opportunities in their org" ON bidding_opportunities;
CREATE POLICY "Users can view bidding opportunities in their org" ON bidding_opportunities FOR SELECT
  USING ((org_id)::text = ((current_setting('request.jwt.claims', true))::json -> 'metadata' ->> 'krewpact_org_id'));

DROP POLICY IF EXISTS "Users can insert bidding opportunities in their org" ON bidding_opportunities;
CREATE POLICY "Users can insert bidding opportunities in their org" ON bidding_opportunities FOR INSERT
  WITH CHECK ((org_id)::text = ((current_setting('request.jwt.claims', true))::json -> 'metadata' ->> 'krewpact_org_id'));

DROP POLICY IF EXISTS "Users can update bidding opportunities in their org" ON bidding_opportunities;
CREATE POLICY "Users can update bidding opportunities in their org" ON bidding_opportunities FOR UPDATE
  USING ((org_id)::text = ((current_setting('request.jwt.claims', true))::json -> 'metadata' ->> 'krewpact_org_id'));

DROP POLICY IF EXISTS "Users can delete bidding opportunities in their org" ON bidding_opportunities;
CREATE POLICY "Users can delete bidding opportunities in their org" ON bidding_opportunities FOR DELETE
  USING ((org_id)::text = ((current_setting('request.jwt.claims', true))::json -> 'metadata' ->> 'krewpact_org_id'));

-- ============================================================
-- 9-12. UPDATE DIRECT POLICIES — portal tables
-- ============================================================

DROP POLICY IF EXISTS "portal_accounts_self_or_internal" ON portal_accounts;
CREATE POLICY "portal_accounts_self_or_internal" ON portal_accounts FOR SELECT
  USING (
    clerk_user_id = (auth.jwt() ->> 'sub')
    OR (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator|operations_manager'
  );

DROP POLICY IF EXISTS "portal_accounts_internal_insert" ON portal_accounts;
CREATE POLICY "portal_accounts_internal_insert" ON portal_accounts FOR INSERT
  WITH CHECK ((auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator');

DROP POLICY IF EXISTS "portal_accounts_internal_update" ON portal_accounts;
CREATE POLICY "portal_accounts_internal_update" ON portal_accounts FOR UPDATE
  USING (
    (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator'
    OR clerk_user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "portal_messages_scoped" ON portal_messages;
CREATE POLICY "portal_messages_scoped" ON portal_messages FOR SELECT
  USING (
    portal_account_id IN (SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR sender_user_id IN (SELECT id FROM users WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR portal_account_id IS NULL
    OR (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator'
  );

DROP POLICY IF EXISTS "portal_messages_portal_insert" ON portal_messages;
CREATE POLICY "portal_messages_portal_insert" ON portal_messages FOR INSERT
  WITH CHECK (
    (direction = 'inbound' AND portal_account_id IN (SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub')))
    OR (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator'
  );

DROP POLICY IF EXISTS "portal_messages_mark_read" ON portal_messages;
CREATE POLICY "portal_messages_mark_read" ON portal_messages FOR UPDATE
  USING (
    portal_account_id IN (SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager'
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "portal_permissions_scoped" ON portal_permissions;
CREATE POLICY "portal_permissions_scoped" ON portal_permissions FOR SELECT
  USING (
    portal_account_id IN (SELECT id FROM portal_accounts WHERE clerk_user_id = (auth.jwt() ->> 'sub'))
    OR (auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator'
  );

DROP POLICY IF EXISTS "portal_permissions_internal_write" ON portal_permissions;
CREATE POLICY "portal_permissions_internal_write" ON portal_permissions FOR INSERT
  WITH CHECK ((auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator');

DROP POLICY IF EXISTS "portal_permissions_internal_update" ON portal_permissions;
CREATE POLICY "portal_permissions_internal_update" ON portal_permissions FOR UPDATE
  USING ((auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager|project_coordinator');

DROP POLICY IF EXISTS "portal_view_logs_admin_read" ON portal_view_logs;
CREATE POLICY "portal_view_logs_admin_read" ON portal_view_logs FOR SELECT
  USING ((auth.jwt() -> 'metadata' ->> 'role_keys') ~ 'platform_admin|project_manager');
