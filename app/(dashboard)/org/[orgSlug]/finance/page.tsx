'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DashboardMetrics {
  accounts_receivable: { total_outstanding: number; invoice_count: number };
  purchase_orders: { total_value: number; po_count: number };
  job_costs: { snapshot_count: number };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export default function FinancePage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setMetrics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: 'Invoices',
      description: 'ERPNext invoice snapshots by project',
      href: 'finance/invoices',
    },
    {
      title: 'Purchase Orders',
      description: 'PO snapshots synced from ERPNext',
      href: 'finance/purchase-orders',
    },
    {
      title: 'Job Costs',
      description: 'Budget vs actuals snapshots per project',
      href: 'finance/job-costs',
    },
  ];

  return (
    <>
      <title>Finance — KrewPact</title>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Read-only financial data synced from ERPNext. ERPNext is the source of truth for all
            accounting.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Accounts Receivable
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {loading
                  ? '...'
                  : metrics
                    ? formatCurrency(metrics.accounts_receivable.total_outstanding)
                    : '\u2014'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? ''
                  : metrics
                    ? `${metrics.accounts_receivable.invoice_count} invoice${metrics.accounts_receivable.invoice_count !== 1 ? 's' : ''}`
                    : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Purchase Orders
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {loading
                  ? '...'
                  : metrics
                    ? formatCurrency(metrics.purchase_orders.total_value)
                    : '\u2014'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? ''
                  : metrics
                    ? `${metrics.purchase_orders.po_count} PO${metrics.purchase_orders.po_count !== 1 ? 's' : ''}`
                    : ''}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                Job Cost Snapshots
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {loading ? '...' : metrics ? String(metrics.job_costs.snapshot_count) : '\u2014'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {loading ? '' : metrics ? 'Budget vs actuals tracked' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="group cursor-pointer bg-white dark:bg-card border shadow-sm hover:shadow-xl hover:scale-[1.02] hover:border-primary/20 transition-all duration-300 rounded-3xl overflow-hidden relative h-full flex flex-col p-2">
                <CardHeader className="flex-1">
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {s.title}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium mt-2">
                    {s.description}
                  </CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
