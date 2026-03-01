/**
 * ERP Sync Service — orchestrates syncing KrewPact entities to ERPNext.
 * Supports mock mode (no real ERPNext) and real mode (via ErpClient).
 *
 * Sync flow:
 * 1. Create erp_sync_jobs record (status=queued)
 * 2. Fetch entity from Supabase
 * 3. Call ERPNext API (or mock)
 * 4. Update job status (succeeded/failed)
 * 5. Create erp_sync_map entry linking local ID to ERPNext docname
 * 6. Log erp_sync_events
 */

import { createUserClient } from '@/lib/supabase/server';
import {
  mockCustomerResponse,
  mockQuotationResponse,
  mockOpportunityResponse,
  mockSalesOrderResponse,
  mockContactResponse,
  mockProjectResponse,
  mockTaskResponse,
  mockSupplierResponse,
  mockExpenseClaimResponse,
  mockTimesheetResponse,
  mockSalesInvoiceResponse,
  mockPurchaseInvoiceResponse,
} from './mock-responses';
import { mapOpportunityToErp } from './opportunity-mapper';
import { mapWonDealToSalesOrder } from './sales-order-mapper';
import { mapContactToErp } from './contact-mapper';
import { mapProjectToErp } from './project-mapper';
import { mapTaskToErp } from './task-mapper';
import { mapSupplierToErp } from './supplier-mapper';
import { mapExpenseToErp } from './expense-mapper';
import { mapTimesheetToErp } from './timesheet-mapper';

/** Check if we're running in mock mode (no real ERPNext) */
export function isMockMode(): boolean {
  return !process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_BASE_URL === 'mock';
}

interface SyncResult {
  id: string;
  status: 'succeeded' | 'failed';
  entity_type: string;
  entity_id: string;
  erp_docname: string | null;
  attempt_count: number;
  error?: string;
}

export class SyncService {
  /**
   * Sync a KrewPact account to ERPNext as a Customer.
   */
  async syncAccount(accountId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();

    // 1. Create sync job
    const job = await this.createSyncJob(supabase, 'account', accountId);

    try {
      // 2. Fetch account
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError || !account) {
        return this.failJob(supabase, job.id, 'account', accountId, `Account not found: ${accountError?.message || 'null'}`);
      }

      // 3. Call ERPNext (or mock)
      const accountData = account as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockCustomerResponse({
          id: accountId,
          account_name: accountData.account_name as string,
          account_type: accountData.account_type as string | undefined,
          billing_address: accountData.billing_address as Record<string, unknown> | null,
        });
        erpDocname = mockResp.name;
      } else {
        // Real mode — delegate to ErpClient
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const result = await client.create<{ name: string }>('Customer', {
          customer_name: accountData.account_name,
          customer_type: 'Company',
          customer_group: 'All Customer Groups',
          territory: 'Canada',
          krewpact_id: accountId,
          default_currency: 'CAD',
        });
        erpDocname = result.name;
      }

      // 4. Create sync map entry (upsert)
      await this.upsertSyncMap(supabase, 'account', accountId, 'Customer', erpDocname);

      // 5. Log event
      await this.logEvent(supabase, job.id, 'sync_completed', {
        entity_type: 'account',
        entity_id: accountId,
        erp_docname: erpDocname,
      });

      // 6. Update job status
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'account',
        entity_id: accountId,
        erp_docname: erpDocname,
        attempt_count: 1,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'account', accountId, message);
    }
  }

  /**
   * Sync a KrewPact estimate to ERPNext as a Quotation.
   */
  async syncEstimate(estimateId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();

    // 1. Create sync job
    const job = await this.createSyncJob(supabase, 'estimate', estimateId);

    try {
      // 2. Fetch estimate with lines
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*, estimate_lines(*)')
        .eq('id', estimateId)
        .single();

      if (estimateError || !estimate) {
        return this.failJob(supabase, job.id, 'estimate', estimateId, `Estimate not found: ${estimateError?.message || 'null'}`);
      }

      // 3. Call ERPNext (or mock)
      const estimateData = estimate as Record<string, unknown>;
      const rawLines = estimateData.estimate_lines;
      const lines = Array.isArray(rawLines) ? rawLines : rawLines ? [rawLines] : [];
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockQuotationResponse(
          {
            id: estimateId,
            estimate_number: estimateData.estimate_number as string,
            subtotal_amount: estimateData.subtotal_amount as number,
            tax_amount: estimateData.tax_amount as number,
            total_amount: estimateData.total_amount as number,
            currency_code: estimateData.currency_code as string | undefined,
            account_id: estimateData.account_id as string | null,
            contact_id: estimateData.contact_id as string | null,
          },
          lines.map((l: Record<string, unknown>) => ({
            description: l.description as string,
            quantity: l.quantity as number,
            unit_cost: l.unit_cost as number,
            unit: l.unit as string | null,
            line_total: l.line_total as number,
          })),
        );
        erpDocname = mockResp.name;
      } else {
        // Real mode — delegate to ErpClient
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const result = await client.create<{ name: string }>('Quotation', {
          title: estimateData.estimate_number,
          quotation_to: 'Customer',
          currency: estimateData.currency_code || 'CAD',
          net_total: estimateData.subtotal_amount,
          grand_total: estimateData.total_amount,
          krewpact_id: estimateId,
          items: lines.map((l: Record<string, unknown>) => ({
            item_name: l.description,
            qty: l.quantity,
            rate: l.unit_cost,
            amount: l.line_total,
          })),
        });
        erpDocname = result.name;
      }

      // 4. Create sync map entry (upsert)
      await this.upsertSyncMap(supabase, 'estimate', estimateId, 'Quotation', erpDocname);

      // 5. Log event
      await this.logEvent(supabase, job.id, 'sync_completed', {
        entity_type: 'estimate',
        entity_id: estimateId,
        erp_docname: erpDocname,
        line_count: lines.length,
      });

      // 6. Update job status
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'estimate',
        entity_id: estimateId,
        erp_docname: erpDocname,
        attempt_count: 1,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'estimate', estimateId, message);
    }
  }

  /**
   * Sync a KrewPact opportunity to ERPNext as an Opportunity.
   */
  async syncOpportunity(opportunityId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();

    // 1. Create sync job
    const job = await this.createSyncJob(supabase, 'opportunity', opportunityId);

    try {
      // 2. Fetch opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (oppError || !opportunity) {
        return this.failJob(supabase, job.id, 'opportunity', opportunityId, `Opportunity not found: ${oppError?.message || 'null'}`);
      }

      // 3. Call ERPNext (or mock)
      const oppData = opportunity as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockOpportunityResponse({
          id: opportunityId,
          opportunity_name: oppData.opportunity_name as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapOpportunityToErp({
          id: opportunityId,
          opportunity_name: oppData.opportunity_name as string,
          estimated_revenue: oppData.estimated_revenue as number | null,
          probability_pct: oppData.probability_pct as number | null,
          target_close_date: oppData.target_close_date as string | null,
          division_id: oppData.division_id as string | null,
          account_id: oppData.account_id as string | null,
        });
        const result = await client.create<{ name: string }>('Opportunity', mapped);
        erpDocname = result.name;
      }

      // 4. Create sync map entry (upsert)
      await this.upsertSyncMap(supabase, 'opportunity', opportunityId, 'Opportunity', erpDocname);

      // 5. Log event
      await this.logEvent(supabase, job.id, 'sync_completed', {
        entity_type: 'opportunity',
        entity_id: opportunityId,
        erp_docname: erpDocname,
      });

      // 6. Update job status
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'opportunity',
        entity_id: opportunityId,
        erp_docname: erpDocname,
        attempt_count: 1,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'opportunity', opportunityId, message);
    }
  }

  /**
   * Sync a won KrewPact opportunity to ERPNext as a Sales Order.
   */
  async syncWonDeal(opportunityId: string, _userId: string, wonDate: string): Promise<SyncResult> {
    const supabase = await createUserClient();

    // 1. Create sync job
    const job = await this.createSyncJob(supabase, 'sales_order', opportunityId);

    try {
      // 2. Fetch opportunity
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (oppError || !opportunity) {
        return this.failJob(supabase, job.id, 'sales_order', opportunityId, `Opportunity not found: ${oppError?.message || 'null'}`);
      }

      const oppData = opportunity as Record<string, unknown>;

      // 3. Call ERPNext (or mock)
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockSalesOrderResponse({
          id: opportunityId,
          name: oppData.opportunity_name as string,
          amount: (oppData.estimated_revenue as number) || 0,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapWonDealToSalesOrder({
          opportunityId,
          opportunityName: oppData.opportunity_name as string,
          accountId: oppData.account_id as string | null,
          estimatedRevenue: oppData.estimated_revenue as number | null,
          wonDate,
        });
        const result = await client.create<{ name: string }>('Sales Order', mapped);
        erpDocname = result.name;
      }

      // 4. Create sync map entry (upsert)
      await this.upsertSyncMap(supabase, 'sales_order', opportunityId, 'Sales Order', erpDocname);

      // 5. Log event
      await this.logEvent(supabase, job.id, 'sync_completed', {
        entity_type: 'sales_order',
        entity_id: opportunityId,
        erp_docname: erpDocname,
      });

      // 6. Update job status
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'sales_order',
        entity_id: opportunityId,
        erp_docname: erpDocname,
        attempt_count: 1,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'sales_order', opportunityId, message);
    }
  }

  /**
   * Sync a KrewPact contact to ERPNext as a Contact.
   */
  async syncContact(contactId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'contact', contactId);

    try {
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (contactError || !contact) {
        return this.failJob(supabase, job.id, 'contact', contactId, `Contact not found: ${contactError?.message || 'null'}`);
      }

      const c = contact as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockContactResponse({
          id: contactId,
          first_name: c.first_name as string,
          last_name: c.last_name as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapContactToErp({
          id: contactId,
          first_name: c.first_name as string,
          last_name: c.last_name as string,
          email: c.email as string | null,
          phone: c.phone as string | null,
          role_title: c.role_title as string | null,
          account_id: c.account_id as string | null,
        });
        const result = await client.create<{ name: string }>('Contact', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'contact', contactId, 'Contact', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'contact', entity_id: contactId, erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'contact', entity_id: contactId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'contact', contactId, message);
    }
  }

  /**
   * Sync a KrewPact project to ERPNext as a Project.
   */
  async syncProject(projectId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'project', projectId);

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return this.failJob(supabase, job.id, 'project', projectId, `Project not found: ${projectError?.message || 'null'}`);
      }

      const p = project as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockProjectResponse({
          id: projectId,
          project_number: p.project_number as string,
          project_name: p.project_name as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapProjectToErp({
          id: projectId,
          project_number: p.project_number as string,
          project_name: p.project_name as string,
          status: p.status as string,
          start_date: p.start_date as string | null,
          target_completion_date: p.target_completion_date as string | null,
          baseline_budget: p.baseline_budget as number | null,
          account_id: p.account_id as string | null,
          division_id: p.division_id as string | null,
        });
        const result = await client.create<{ name: string }>('Project', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'project', projectId, 'Project', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'project', entity_id: projectId, erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'project', entity_id: projectId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'project', projectId, message);
    }
  }

  /**
   * Sync a KrewPact task to ERPNext as a Task.
   */
  async syncTask(taskId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'task', taskId);

    try {
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) {
        return this.failJob(supabase, job.id, 'task', taskId, `Task not found: ${taskError?.message || 'null'}`);
      }

      const t = task as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockTaskResponse({
          id: taskId,
          title: t.title as string,
          project_id: t.project_id as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapTaskToErp({
          id: taskId,
          project_id: t.project_id as string,
          title: t.title as string,
          description: t.description as string | null,
          status: t.status as string,
          priority: t.priority as string | null,
          assigned_user_id: t.assigned_user_id as string | null,
          due_at: t.due_at as string | null,
          start_at: t.start_at as string | null,
          completed_at: t.completed_at as string | null,
        });
        const result = await client.create<{ name: string }>('Task', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'task', taskId, 'Task', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'task', entity_id: taskId, erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'task', entity_id: taskId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'task', taskId, message);
    }
  }

  /**
   * Sync a KrewPact trade partner / portal account to ERPNext as a Supplier.
   */
  async syncSupplier(portalAccountId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'supplier', portalAccountId);

    try {
      const { data: portalAccount, error: paError } = await supabase
        .from('portal_accounts')
        .select('*')
        .eq('id', portalAccountId)
        .single();

      if (paError || !portalAccount) {
        return this.failJob(supabase, job.id, 'supplier', portalAccountId, `Portal account not found: ${paError?.message || 'null'}`);
      }

      const pa = portalAccount as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockSupplierResponse({
          id: portalAccountId,
          company_name: pa.company_name as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapSupplierToErp({
          id: portalAccountId,
          company_name: pa.company_name as string,
          account_type: pa.account_type as string | null,
          billing_address: pa.billing_address as Record<string, unknown> | null,
          division_id: pa.division_id as string | null,
        });
        const result = await client.create<{ name: string }>('Supplier', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'supplier', portalAccountId, 'Supplier', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'supplier', entity_id: portalAccountId, erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'supplier', entity_id: portalAccountId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'supplier', portalAccountId, message);
    }
  }

  /**
   * Sync a KrewPact expense claim to ERPNext as an Expense Claim.
   */
  async syncExpenseClaim(expenseClaimId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'expense_claim', expenseClaimId);

    try {
      const { data: expense, error: expenseError } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('id', expenseClaimId)
        .single();

      if (expenseError || !expense) {
        return this.failJob(supabase, job.id, 'expense_claim', expenseClaimId, `Expense claim not found: ${expenseError?.message || 'null'}`);
      }

      const e = expense as Record<string, unknown>;
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockExpenseClaimResponse({
          id: expenseClaimId,
          amount: e.amount as number,
          expense_date: e.expense_date as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapExpenseToErp({
          id: expenseClaimId,
          user_id: e.user_id as string,
          project_id: e.project_id as string | null,
          amount: e.amount as number,
          tax_amount: e.tax_amount as number | null,
          category: e.category as string | null,
          description: e.description as string | null,
          expense_date: e.expense_date as string,
          currency_code: e.currency_code as string | null,
        });
        const result = await client.create<{ name: string }>('Expense Claim', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'expense_claim', expenseClaimId, 'Expense Claim', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'expense_claim', entity_id: expenseClaimId, erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'expense_claim', entity_id: expenseClaimId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'expense_claim', expenseClaimId, message);
    }
  }

  /**
   * Sync a KrewPact timesheet batch to ERPNext as a Timesheet.
   */
  async syncTimesheet(timesheetBatchId: string, _userId: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'timesheet', timesheetBatchId);

    try {
      const { data: batch, error: batchError } = await supabase
        .from('timesheet_batches')
        .select('*, time_entries(*)')
        .eq('id', timesheetBatchId)
        .single();

      if (batchError || !batch) {
        return this.failJob(supabase, job.id, 'timesheet', timesheetBatchId, `Timesheet batch not found: ${batchError?.message || 'null'}`);
      }

      const b = batch as Record<string, unknown>;
      const rawEntries = b.time_entries;
      const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
      let erpDocname: string;

      if (isMockMode()) {
        const mockResp = mockTimesheetResponse({
          id: timesheetBatchId,
          total_hours: b.total_hours as number,
          period_start: b.period_start as string,
          period_end: b.period_end as string,
        });
        erpDocname = mockResp.name;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        const mapped = mapTimesheetToErp({
          id: timesheetBatchId,
          user_id: b.user_id as string,
          period_start: b.period_start as string,
          period_end: b.period_end as string,
          total_hours: b.total_hours as number,
          currency_code: b.currency_code as string | null,
          entries: entries.map((entry: Record<string, unknown>) => ({
            id: entry.id as string,
            project_id: entry.project_id as string | null,
            task_id: entry.task_id as string | null,
            description: entry.description as string | null,
            hours: entry.hours as number,
            entry_date: entry.entry_date as string,
          })),
        });
        const result = await client.create<{ name: string }>('Timesheet', mapped);
        erpDocname = result.name;
      }

      await this.upsertSyncMap(supabase, 'timesheet', timesheetBatchId, 'Timesheet', erpDocname);
      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'timesheet', entity_id: timesheetBatchId, erp_docname: erpDocname, entry_count: entries.length });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'timesheet', entity_id: timesheetBatchId, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'timesheet', timesheetBatchId, message);
    }
  }

  /**
   * Read a Sales Invoice from ERPNext and store snapshot in invoice_snapshots.
   * Inbound read-only — no data written to ERPNext.
   */
  async readSalesInvoice(erpDocname: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'sales_invoice', erpDocname);

    try {
      let invoiceData: Record<string, unknown>;

      if (isMockMode()) {
        const mockResp = mockSalesInvoiceResponse(erpDocname);
        invoiceData = mockResp.data;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        invoiceData = await client.get<Record<string, unknown>>('Sales Invoice', erpDocname);
      }

      // Store snapshot in invoice_snapshots
      await supabase.from('invoice_snapshots').upsert({
        erp_docname: erpDocname,
        doctype: 'Sales Invoice',
        snapshot: invoiceData,
        synced_at: new Date().toISOString(),
      });

      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'sales_invoice', erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'sales_invoice', entity_id: erpDocname, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'sales_invoice', erpDocname, message);
    }
  }

  /**
   * Read a Purchase Invoice from ERPNext and store snapshot in po_snapshots.
   * Inbound read-only — no data written to ERPNext.
   */
  async readPurchaseInvoice(erpDocname: string): Promise<SyncResult> {
    const supabase = await createUserClient();
    const job = await this.createSyncJob(supabase, 'purchase_invoice', erpDocname);

    try {
      let invoiceData: Record<string, unknown>;

      if (isMockMode()) {
        const mockResp = mockPurchaseInvoiceResponse(erpDocname);
        invoiceData = mockResp.data;
      } else {
        const { ErpClient } = await import('./client');
        const client = new ErpClient();
        invoiceData = await client.get<Record<string, unknown>>('Purchase Invoice', erpDocname);
      }

      // Store snapshot in po_snapshots
      await supabase.from('po_snapshots').upsert({
        erp_docname: erpDocname,
        doctype: 'Purchase Invoice',
        snapshot: invoiceData,
        synced_at: new Date().toISOString(),
      });

      await this.logEvent(supabase, job.id, 'sync_completed', { entity_type: 'purchase_invoice', erp_docname: erpDocname });
      await this.updateJobStatus(supabase, job.id, 'succeeded');

      return { id: job.id, status: 'succeeded', entity_type: 'purchase_invoice', entity_id: erpDocname, erp_docname: erpDocname, attempt_count: 1 };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.failJob(supabase, job.id, 'purchase_invoice', erpDocname, message);
    }
  }

  /**
   * Get the sync status for a given entity type and ID.
   * Returns the sync map entry or null if not synced.
   */
  async getSyncStatus(entityType: string, entityId: string): Promise<Record<string, unknown> | null> {
    const supabase = await createUserClient();

    const { data } = await supabase
      .from('erp_sync_map')
      .select('*')
      .eq('entity_type', entityType)
      .eq('local_id', entityId)
      .maybeSingle();

    return data as Record<string, unknown> | null;
  }

  // --- Private helpers ---

  private async createSyncJob(
    supabase: Awaited<ReturnType<typeof createUserClient>>,
    entityType: string,
    entityId: string,
  ): Promise<{ id: string }> {
    const { data } = await supabase
      .from('erp_sync_jobs')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        status: 'queued',
        sync_direction: 'outbound',
        attempt_count: 0,
        max_attempts: 3,
        payload: {},
      })
      .select('id')
      .single();

    return { id: (data as Record<string, unknown>)?.id as string || 'unknown' };
  }

  private async updateJobStatus(
    supabase: Awaited<ReturnType<typeof createUserClient>>,
    jobId: string,
    status: 'succeeded' | 'failed',
  ): Promise<void> {
    await supabase
      .from('erp_sync_jobs')
      .update({
        status,
        completed_at: new Date().toISOString(),
        attempt_count: 1,
      })
      .eq('id', jobId);
  }

  private async upsertSyncMap(
    supabase: Awaited<ReturnType<typeof createUserClient>>,
    entityType: string,
    localId: string,
    erpDoctype: string,
    erpDocname: string,
  ): Promise<void> {
    await supabase
      .from('erp_sync_map')
      .upsert({
        entity_type: entityType,
        local_id: localId,
        erp_doctype: erpDoctype,
        erp_docname: erpDocname,
        direction: 'outbound',
      });
  }

  private async logEvent(
    supabase: Awaited<ReturnType<typeof createUserClient>>,
    jobId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await supabase
      .from('erp_sync_events')
      .insert({
        job_id: jobId,
        event_type: eventType,
        event_payload: payload,
      });
  }

  private async failJob(
    supabase: Awaited<ReturnType<typeof createUserClient>>,
    jobId: string,
    entityType: string,
    entityId: string,
    errorMessage: string,
  ): Promise<SyncResult> {
    // Log error
    await supabase
      .from('erp_sync_errors')
      .insert({
        job_id: jobId,
        error_message: errorMessage,
        error_code: 'SYNC_ERROR',
      });

    // Log event
    await this.logEvent(supabase, jobId, 'sync_failed', {
      entity_type: entityType,
      entity_id: entityId,
      error: errorMessage,
    });

    // Update job
    await this.updateJobStatus(supabase, jobId, 'failed');

    return {
      id: jobId,
      status: 'failed',
      entity_type: entityType,
      entity_id: entityId,
      erp_docname: null,
      attempt_count: 1,
      error: errorMessage,
    };
  }
}
