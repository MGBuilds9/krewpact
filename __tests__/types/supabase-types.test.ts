import { describe, it, expect } from 'vitest';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

describe('Supabase Database Types', () => {
  it('exports Database type with public schema', () => {
    // Compile-time: keyof Tables must include all expected table names
    const allTables: (keyof Tables)[] = [
      'audit_logs',
      'divisions',
      'roles',
      'user_divisions',
      'user_roles',
      'users',
      'accounts',
      'contacts',
      'leads',
      'opportunities',
      'activities',
      'opportunity_stage_history',
      'estimates',
      'estimate_lines',
      'estimate_versions',
      'projects',
      'project_members',
      'milestones',
      'tasks',
      'task_comments',
      'project_daily_logs',
      'expense_claims',
      'notifications',
      'notification_preferences',
      'erp_sync_map',
      'erp_sync_jobs',
      'erp_sync_events',
      'erp_sync_errors',
    ];
    expect(allTables).toHaveLength(28);
  });

  it('contains all expected CRM tables', () => {
    const crmTables: (keyof Tables)[] = [
      'accounts',
      'contacts',
      'leads',
      'opportunities',
      'activities',
      'opportunity_stage_history',
    ];
    expect(crmTables).toHaveLength(6);
  });

  it('contains all expected estimating tables', () => {
    const estimatingTables: (keyof Tables)[] = ['estimates', 'estimate_lines', 'estimate_versions'];
    expect(estimatingTables).toHaveLength(3);
  });

  it('contains all expected project tables', () => {
    const projectTables: (keyof Tables)[] = [
      'projects',
      'project_members',
      'milestones',
      'tasks',
      'task_comments',
      'project_daily_logs',
    ];
    expect(projectTables).toHaveLength(6);
  });

  it('contains expense_claims table', () => {
    const expenseTables: (keyof Tables)[] = ['expense_claims'];
    expect(expenseTables).toHaveLength(1);
  });

  it('contains notification tables', () => {
    const notifTables: (keyof Tables)[] = ['notifications', 'notification_preferences'];
    expect(notifTables).toHaveLength(2);
  });

  it('contains ERP sync tables', () => {
    const erpTables: (keyof Tables)[] = [
      'erp_sync_map',
      'erp_sync_jobs',
      'erp_sync_events',
      'erp_sync_errors',
    ];
    expect(erpTables).toHaveLength(4);
  });

  it('contains foundation tables', () => {
    const foundationTables: (keyof Tables)[] = [
      'audit_logs',
      'divisions',
      'roles',
      'user_divisions',
      'user_roles',
      'users',
    ];
    expect(foundationTables).toHaveLength(6);
  });

  it('exports all expected enums', () => {
    const enumKeys: (keyof Enums)[] = [
      'lead_stage',
      'opportunity_stage',
      'estimate_status',
      'project_status',
      'task_status',
      'expense_status',
      'notification_channel',
      'notification_state',
      'role_scope',
      'sync_direction',
      'sync_status',
      'user_status',
      'workflow_state',
    ];
    expect(enumKeys).toHaveLength(13);
  });

  it('projects table has canonical columns', () => {
    // Compile-time: if columns don't exist or have wrong types, this won't compile
    const check: Tables['projects']['Row'] extends {
      project_name: string;
      project_number: string;
      division_id: string;
      status: Enums['project_status'];
      baseline_budget: number;
      current_budget: number;
      site_address: unknown;
    }
      ? true
      : never = true;
    expect(check).toBe(true);
  });

  it('tasks table has canonical columns', () => {
    const check: Tables['tasks']['Row'] extends {
      title: string;
      status: string | null;
      assigned_user_id: string | null;
      due_at: string | null;
    }
      ? true
      : never = true;
    expect(check).toBe(true);
  });

  it('expense_claims table has canonical columns', () => {
    const check: Tables['expense_claims']['Row'] extends {
      amount: number;
      category: string;
      expense_date: string;
      status: Enums['expense_status'];
      user_id: string;
      currency_code: string;
    }
      ? true
      : never = true;
    expect(check).toBe(true);
  });

  it('notifications table has canonical columns', () => {
    const check: Tables['notifications']['Row'] extends {
      title: string;
      state: Enums['notification_state'];
      channel: Enums['notification_channel'];
      user_id: string | null;
    }
      ? true
      : never = true;
    expect(check).toBe(true);
  });
});
