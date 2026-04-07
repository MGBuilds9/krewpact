'use client';

import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceDashboard } from '@/hooks/useFinance';

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

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export default function FinancePage() {
  const { data: metrics, isLoading, isError } = useFinanceDashboard();

  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Finance Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Read-only financial data synced from ERPNext. ERPNext is the source of truth for all
            accounting.
          </p>
        </div>
        {isError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">Failed to load finance metrics.</p>
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : metrics ? (
            <>
              <MetricCard
                label="Accounts Receivable"
                value={formatCurrency(metrics.accounts_receivable.total_outstanding)}
                sub={`${metrics.accounts_receivable.invoice_count} invoice${metrics.accounts_receivable.invoice_count !== 1 ? 's' : ''}`}
              />
              <MetricCard
                label="Purchase Orders"
                value={formatCurrency(metrics.purchase_orders.total_value)}
                sub={`${metrics.purchase_orders.po_count} PO${metrics.purchase_orders.po_count !== 1 ? 's' : ''}`}
              />
              <MetricCard
                label="Job Cost Snapshots"
                value={String(metrics.job_costs.snapshot_count)}
                sub="Budget vs actuals tracked"
              />
            </>
          ) : null}
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
