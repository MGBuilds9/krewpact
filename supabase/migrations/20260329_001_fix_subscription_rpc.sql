-- Fix get_subscription_summary to accept optional division filter.
-- Mirrors the pattern used by get_pipeline_summary / get_project_portfolio / get_estimating_velocity.

CREATE OR REPLACE FUNCTION get_subscription_summary(p_division_id uuid DEFAULT NULL)
RETURNS TABLE(total_monthly numeric, active_count bigint, expiring_soon_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    COALESCE(SUM(monthly_cost) FILTER (WHERE is_active), 0)::numeric,
    COUNT(*) FILTER (WHERE is_active)::bigint,
    COUNT(*) FILTER (WHERE is_active AND renewal_date <= CURRENT_DATE + INTERVAL '30 days')::bigint
  FROM executive_subscriptions
  WHERE (p_division_id IS NULL OR division_id = p_division_id);
$$;
