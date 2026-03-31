-- Fix P0: ai_insights, ai_actions, user_digests RLS policies grant cross-org read access.
--
-- The existing policies use a correlated subquery that references the OUTER table's org_id
-- inside a SELECT from users (which has no org_id column). This resolves to "always true"
-- for any authenticated user, meaning any user can read all orgs' AI data.
--
-- Fix: Replace with krewpact_org_id() pattern matching all other tables.
-- krewpact_org_id() reads the JWT claim and returns text, so we cast to uuid.

-- ai_insights: SELECT policy
DROP POLICY IF EXISTS ai_insights_select ON ai_insights;
CREATE POLICY ai_insights_select ON ai_insights
  FOR SELECT
  USING (org_id = krewpact_org_id()::uuid);

-- ai_insights: UPDATE policy
DROP POLICY IF EXISTS ai_insights_update ON ai_insights;
CREATE POLICY ai_insights_update ON ai_insights
  FOR UPDATE
  USING (org_id = krewpact_org_id()::uuid);

-- ai_actions: SELECT policy
DROP POLICY IF EXISTS ai_actions_select ON ai_actions;
CREATE POLICY ai_actions_select ON ai_actions
  FOR SELECT
  USING (org_id = krewpact_org_id()::uuid);

-- user_digests: SELECT policy
DROP POLICY IF EXISTS user_digests_select ON user_digests;
CREATE POLICY user_digests_select ON user_digests
  FOR SELECT
  USING (org_id = krewpact_org_id()::uuid);
