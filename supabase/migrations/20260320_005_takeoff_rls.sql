-- Fix takeoff RLS policies
-- Drop broken "Service role full access" policies (qual: true on {public} role = wide open)
-- Replace with org-scoped policies chaining through estimates.org_id

DROP POLICY IF EXISTS "Service role full access" ON takeoff_jobs;
DROP POLICY IF EXISTS "Service role full access" ON takeoff_plans;
DROP POLICY IF EXISTS "Service role full access" ON takeoff_pages;
DROP POLICY IF EXISTS "Service role full access" ON takeoff_draft_lines;
DROP POLICY IF EXISTS "Service role full access" ON takeoff_feedback;

-- takeoff_jobs: chains directly to estimates.org_id
CREATE POLICY "Org-scoped access" ON takeoff_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = takeoff_jobs.estimate_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = takeoff_jobs.estimate_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  );

-- takeoff_plans: chains through takeoff_jobs → estimates.org_id
CREATE POLICY "Org-scoped access" ON takeoff_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_plans.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_plans.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  );

-- takeoff_pages: chains through takeoff_jobs → estimates.org_id
CREATE POLICY "Org-scoped access" ON takeoff_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_pages.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_pages.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  );

-- takeoff_draft_lines: chains through takeoff_jobs → estimates.org_id
CREATE POLICY "Org-scoped access" ON takeoff_draft_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_draft_lines.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_draft_lines.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  );

-- takeoff_feedback: chains through takeoff_jobs → estimates.org_id
CREATE POLICY "Org-scoped access" ON takeoff_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_feedback.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM takeoff_jobs tj
      JOIN estimates e ON e.id = tj.estimate_id
      WHERE tj.id = takeoff_feedback.job_id
        AND e.org_id = (auth.jwt() ->> 'krewpact_org_id')::uuid
    )
  );
