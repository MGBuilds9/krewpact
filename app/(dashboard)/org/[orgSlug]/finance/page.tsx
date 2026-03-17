'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardMetrics {
  accounts_receivable: { total_outstanding: number; invoice_count: number };
  purchase_orders: { total_value: number; po_count: number };
  job_costs: { snapshot_count: number };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

const SECTIONS = [
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

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function buildMetrics(loading: boolean, metrics: DashboardMetrics | null) {
  if (loading)
    return [
      { label: 'Accounts Receivable', value: '...', sub: '' },
      { label: 'Purchase Orders', value: '...', sub: '' },
      { label: 'Job Cost Snapshots', value: '...', sub: '' },
    ];
  if (!metrics)
    return [
      { label: 'Accounts Receivable', value: '\u2014', sub: '' },
      { label: 'Purchase Orders', value: '\u2014', sub: '' },
      { label: 'Job Cost Snapshots', value: '\u2014', sub: '' },
    ];
  const ar = metrics.accounts_receivable;
  const po = metrics.purchase_orders;
  const jc = metrics.job_costs;
  return [
    {
      label: 'Accounts Receivable',
      value: formatCurrency(ar.total_outstanding),
      sub: `${ar.invoice_count} invoice${ar.invoice_count !== 1 ? 's' : ''}`,
    },
    {
      label: 'Purchase Orders',
      value: formatCurrency(po.total_value),
      sub: `${po.po_count} PO${po.po_count !== 1 ? 's' : ''}`,
    },
    {
      label: 'Job Cost Snapshots',
      value: String(jc.snapshot_count),
      sub: 'Budget vs actuals tracked',
    },
  ];
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

  const metricCards = buildMetrics(loading, metrics);

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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {metricCards.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} sub={m.sub} />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {SECTIONS.map((s) => (
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
