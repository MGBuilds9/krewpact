/**
 * Financial operations service.
 * Implements Ontario Construction Act holdback (10% for 60 days),
 * aged receivables aging, and payment history from ERPNext snapshots.
 */

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

export const HOLDBACK_RATE = 0.1; // 10% Ontario Construction Act
export const HOLDBACK_DAYS = 60; // 60-day release window

export interface HoldbackItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  holdbackAmount: number;
  substantialPerformanceDate: string | null;
  releaseDate: string | null;
  daysUntilRelease: number | null;
  status: 'held' | 'released' | 'pending_performance';
}

export interface HoldbackSchedule {
  projectId: string;
  items: HoldbackItem[];
  totalHeld: number;
  totalReleased: number;
  nextRelease: string | null;
}

export interface AgedReceivablesBucket {
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  total: number;
}

export interface AgedReceivablesRow {
  customerId: string;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90plus: number;
  total: number;
}

export interface AgedReceivablesReport {
  asOf: string;
  rows: AgedReceivablesRow[];
  totals: AgedReceivablesBucket;
}

export interface PaymentEntry {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  paymentDate: string;
  amountPaid: number;
  status: string;
  erpDocname: string | null;
}

export interface PaymentHistory {
  projectId: string;
  payments: PaymentEntry[];
  totalPaid: number;
  totalOutstanding: number;
}

function calcReleaseDate(substantialPerformanceDate: string): string {
  const d = new Date(substantialPerformanceDate);
  d.setDate(d.getDate() + HOLDBACK_DAYS);
  return d.toISOString().split('T')[0]!;
}

function daysFromNow(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / 86_400_000);
}

function ageBucket(dueDate: string | null): keyof Omit<AgedReceivablesBucket, 'total'> {
  if (!dueDate) return 'current';
  const ageDays = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000);
  if (ageDays <= 0) return 'current';
  if (ageDays <= 30) return 'days30';
  if (ageDays <= 60) return 'days60';
  return 'days90plus';
}

export async function calculateHoldbacks(projectId: string): Promise<HoldbackItem[]> {
  const supabase = createServiceClient();
  const { data: invoices, error } = await supabase
    .from('invoice_snapshots')
    .select('id, invoice_number, invoice_date, total_amount, snapshot_payload, status, created_at')
    .eq('project_id', projectId)
    .in('status', ['submitted', 'paid']);

  if (error) {
    logger.error('calculateHoldbacks: supabase error', { projectId, error });
    return [];
  }

  return (invoices ?? []).map((inv) => {
    const totalAmount = inv.total_amount ?? 0;
    const holdbackAmount = totalAmount * HOLDBACK_RATE;

    const payload = inv.snapshot_payload as Record<string, unknown> | null;
    const substantialPerformanceDate =
      typeof payload?.['substantial_performance_date'] === 'string'
        ? payload['substantial_performance_date']
        : null;

    const releaseDate = substantialPerformanceDate
      ? calcReleaseDate(substantialPerformanceDate)
      : null;

    const daysUntilRelease = releaseDate ? daysFromNow(releaseDate) : null;

    let status: HoldbackItem['status'];
    if (!substantialPerformanceDate) {
      status = 'pending_performance';
    } else if (daysUntilRelease !== null && daysUntilRelease <= 0) {
      status = 'released';
    } else {
      status = 'held';
    }

    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date ?? inv.created_at,
      totalAmount,
      holdbackAmount,
      substantialPerformanceDate,
      releaseDate,
      daysUntilRelease,
      status,
    };
  });
}

export async function getHoldbackSchedule(projectId: string): Promise<HoldbackSchedule> {
  const items = await calculateHoldbacks(projectId);

  const totalHeld = items
    .filter((i) => i.status === 'held')
    .reduce((sum, i) => sum + i.holdbackAmount, 0);

  const totalReleased = items
    .filter((i) => i.status === 'released')
    .reduce((sum, i) => sum + i.holdbackAmount, 0);

  const upcomingReleases = items
    .filter((i) => i.releaseDate && i.status === 'held')
    .sort((a, b) => (a.releaseDate! > b.releaseDate! ? 1 : -1));

  const nextRelease = upcomingReleases[0]?.releaseDate ?? null;

  return { projectId, items, totalHeld, totalReleased, nextRelease };
}

export async function getAgedReceivables(orgId: string): Promise<AgedReceivablesReport> {
  const supabase = createServiceClient();
  const { data: invoices, error } = await supabase
    .from('invoice_snapshots')
    .select('customer_name, due_date, total_amount, amount_paid, status')
    .not('status', 'in', '("paid","cancelled")')
    .order('due_date', { ascending: true });

  if (error) {
    logger.error('getAgedReceivables: supabase error', { orgId, error });
    return { asOf: new Date().toISOString(), rows: [], totals: buildEmptyBucket() };
  }

  const customerMap = new Map<string, AgedReceivablesRow>();

  for (const inv of invoices ?? []) {
    const customerName = inv.customer_name ?? 'Unknown';
    const outstanding = (inv.total_amount ?? 0) - (inv.amount_paid ?? 0);
    if (outstanding <= 0) continue;

    const bucket = ageBucket(inv.due_date);
    const existing = customerMap.get(customerName);

    if (existing) {
      existing[bucket] += outstanding;
      existing.total += outstanding;
    } else {
      const row: AgedReceivablesRow = {
        customerId: customerName,
        customerName,
        current: 0,
        days30: 0,
        days60: 0,
        days90plus: 0,
        total: outstanding,
      };
      row[bucket] = outstanding;
      customerMap.set(customerName, row);
    }
  }

  const rows = Array.from(customerMap.values()).sort((a, b) => b.total - a.total);

  const totals = rows.reduce(
    (acc, row) => ({
      current: acc.current + row.current,
      days30: acc.days30 + row.days30,
      days60: acc.days60 + row.days60,
      days90plus: acc.days90plus + row.days90plus,
      total: acc.total + row.total,
    }),
    buildEmptyBucket(),
  );

  return { asOf: new Date().toISOString(), rows, totals };
}

function buildEmptyBucket(): AgedReceivablesBucket {
  return { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 };
}

export async function getPaymentHistory(projectId: string): Promise<PaymentHistory> {
  const supabase = createServiceClient();
  const { data: invoices, error } = await supabase
    .from('invoice_snapshots')
    .select(
      'id, invoice_number, customer_name, updated_at, amount_paid, total_amount, status, erp_docname',
    )
    .eq('project_id', projectId)
    .gt('amount_paid', 0)
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('getPaymentHistory: supabase error', { projectId, error });
    return { projectId, payments: [], totalPaid: 0, totalOutstanding: 0 };
  }

  const payments: PaymentEntry[] = (invoices ?? []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    customerName: inv.customer_name,
    paymentDate: inv.updated_at,
    amountPaid: inv.amount_paid ?? 0,
    status: inv.status ?? 'unknown',
    erpDocname: inv.erp_docname,
  }));

  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  const allInvoices = await supabase
    .from('invoice_snapshots')
    .select('total_amount, amount_paid')
    .eq('project_id', projectId)
    .not('status', 'in', '("cancelled")');

  const totalOutstanding = (allInvoices.data ?? []).reduce(
    (sum, inv) => sum + Math.max(0, (inv.total_amount ?? 0) - (inv.amount_paid ?? 0)),
    0,
  );

  return { projectId, payments, totalPaid, totalOutstanding };
}
